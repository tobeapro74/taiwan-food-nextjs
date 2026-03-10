import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb";
import { JWTPayload } from "@/lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "taiwan-food-secret-key";

// 관리자 인증 헬퍼
async function getAdminUser(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get("auth_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    if (!decoded.is_admin && decoded.name !== "박병철") return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: "관리자 권한이 필요합니다." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, all
    const type = searchParams.get("type") || "overview"; // overview, users, content, activity

    const db = await connectToDatabase();

    // 기간 계산
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d": startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "30d": startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case "90d": startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      default: startDate = new Date("2020-01-01"); break;
    }

    if (type === "overview") {
      const [
        totalMembers,
        newMembers,
        totalSchedules,
        totalReviews,
        totalRestaurants,
        recentActivity,
        membersList,
      ] = await Promise.all([
        // 전체 회원 수
        db.collection("members").countDocuments(),
        // 기간 내 신규 가입자
        db.collection("members").countDocuments({
          created_at: { $gte: startDate.toISOString() },
        }),
        // 전체 저장된 일정
        db.collection("saved_schedules").countDocuments(),
        // 전체 리뷰
        db.collection("reviews").countDocuments(),
        // 사용자 등록 맛집
        db.collection("custom_restaurants").countDocuments(),
        // 최근 활동 로그
        db.collection("activity_logs")
          .find({ createdAt: { $gte: startDate } })
          .sort({ createdAt: -1 })
          .limit(50)
          .toArray(),
        // 회원 목록
        db.collection("members")
          .find({}, { projection: { password: 0 } })
          .sort({ created_at: -1 })
          .toArray(),
      ]);

      // 일별 활동 집계 (차트용)
      const dailyActivity = await db.collection("activity_logs").aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              action: "$action",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ]).toArray();

      // 일별 방문자 수 (유니크 userId 기준)
      const dailyVisitors = await db.collection("activity_logs").aggregate([
        { $match: { createdAt: { $gte: startDate }, action: "page_view" } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            uniqueUsers: { $addToSet: "$userId" },
            totalViews: { $sum: 1 },
          },
        },
        {
          $project: {
            date: "$_id",
            uniqueUsers: { $size: "$uniqueUsers" },
            totalViews: 1,
          },
        },
        { $sort: { date: 1 } },
      ]).toArray();

      // 콘텐츠 사용 통계
      const contentUsage = await db.collection("activity_logs").aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray();

      // 일정 생성 통계 (지역별)
      const schedulesByRegion = await db.collection("saved_schedules").aggregate([
        {
          $group: {
            _id: "$schedule.region",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]).toArray();

      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalMembers,
            newMembers,
            totalSchedules,
            totalReviews,
            totalRestaurants,
          },
          members: membersList.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            profile_image: m.profile_image,
            is_admin: m.is_admin,
            kakao_id: m.kakao_id,
            created_at: m.created_at,
            updated_at: m.updated_at,
          })),
          dailyActivity,
          dailyVisitors,
          contentUsage,
          schedulesByRegion,
          recentActivity: recentActivity.map((a) => ({
            userId: a.userId,
            userName: a.userName,
            action: a.action,
            details: a.details,
            createdAt: a.createdAt,
          })),
        },
      });
    }

    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { success: false, error: "통계 조회 실패" },
      { status: 500 }
    );
  }
}
