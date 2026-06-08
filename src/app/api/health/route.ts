import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, string> = { server: "ok" };
  let totalMembers: number | undefined;
  let dauYesterday: number | undefined;
  let newMembersYesterday: number | undefined;

  try {
    const db = await getDb();
    checks["db"] = "ok";

    const kstOffset = 9 * 60 * 60 * 1000;
    const nowKst = new Date(Date.now() + kstOffset);
    const yStartKst = new Date(nowKst);
    yStartKst.setDate(yStartKst.getDate() - 1);
    yStartKst.setHours(0, 0, 0, 0);
    const yEndKst = new Date(yStartKst);
    yEndKst.setHours(23, 59, 59, 999);
    const yStart = new Date(yStartKst.getTime() - kstOffset);
    const yEnd = new Date(yEndKst.getTime() - kstOffset);

    const users = db.collection("users");
    totalMembers = await users.countDocuments();
    dauYesterday = await users.countDocuments({
      last_login_at: { $gte: yStart, $lte: yEnd },
    });
    newMembersYesterday = await users.countDocuments({
      created_at: { $gte: yStart, $lte: yEnd },
    });
  } catch {
    checks["db"] = "error";
  }

  const overall = Object.values(checks).every((v) => v === "ok") ? "ok" : "degraded";

  return NextResponse.json({
    status: overall,
    app: "taiwan-food",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    checks,
    ...(totalMembers !== undefined && { total_members: totalMembers }),
    ...(dauYesterday !== undefined && { dau_yesterday: dauYesterday }),
    ...(newMembersYesterday !== undefined && { new_members_yesterday: newMembersYesterday }),
  });
}
