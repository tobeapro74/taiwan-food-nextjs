"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, CalendarDays, Star, UtensilsCrossed, TrendingUp,
  RefreshCw, Activity, Eye, Search, MapPin, Bot, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface OverviewStats {
  totalMembers: number;
  newMembers: number;
  totalSchedules: number;
  totalReviews: number;
  totalRestaurants: number;
}

interface MemberInfo {
  id: number;
  name: string;
  email: string;
  profile_image?: string;
  is_admin: boolean;
  kakao_id?: number;
  created_at: string;
  updated_at?: string;
}

interface DailyVisitor {
  date: string;
  uniqueUsers: number;
  totalViews: number;
}

interface ContentUsage {
  _id: string;
  count: number;
}

interface ScheduleRegion {
  _id: string;
  count: number;
}

interface ActivityLog {
  userId: number | null;
  userName: string | null;
  action: string;
  details?: Record<string, string>;
  createdAt: string;
}

interface DashboardData {
  overview: OverviewStats;
  members: MemberInfo[];
  dailyVisitors: DailyVisitor[];
  contentUsage: ContentUsage[];
  schedulesByRegion: ScheduleRegion[];
  recentActivity: ActivityLog[];
}

const PERIOD_OPTIONS = [
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
  { value: "90d", label: "90일" },
  { value: "all", label: "전체" },
];

const ACTION_LABELS: Record<string, string> = {
  page_view: "페이지 방문",
  login: "로그인",
  search: "검색",
  ai_recommend: "AI 추천",
  schedule_generate: "일정 생성",
  review_write: "리뷰 작성",
  nearby_search: "주변 검색",
  toilet_search: "화장실 검색",
  restaurant_view: "맛집 상세",
};

const CHART_COLORS = [
  "hsl(15, 90%, 55%)", // primary
  "hsl(36, 78%, 55%)", // accent
  "hsl(200, 70%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(280, 60%, 55%)",
  "hsl(45, 85%, 55%)",
  "hsl(340, 70%, 55%)",
  "hsl(180, 50%, 45%)",
];

const ACTION_ICONS: Record<string, typeof Activity> = {
  page_view: Eye,
  login: Users,
  search: Search,
  ai_recommend: Bot,
  schedule_generate: CalendarDays,
  review_write: MessageSquare,
  nearby_search: MapPin,
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${period}&type=overview`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between pt-4">
        <h1 className="text-xl font-bold">관리자 대시보드</h1>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* 기간 선택 */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={period === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(opt.value)}
            className="text-xs"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="전체 회원"
          value={data.overview.totalMembers}
          sub={`+${data.overview.newMembers} 신규`}
          icon={Users}
          color="text-blue-500"
        />
        <StatCard
          title="저장 일정"
          value={data.overview.totalSchedules}
          icon={CalendarDays}
          color="text-green-500"
        />
        <StatCard
          title="리뷰"
          value={data.overview.totalReviews}
          icon={Star}
          color="text-yellow-500"
        />
        <StatCard
          title="등록 맛집"
          value={data.overview.totalRestaurants}
          icon={UtensilsCrossed}
          color="text-primary"
        />
      </div>

      {/* 탭 */}
      <Tabs defaultValue="visitors" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="visitors" className="flex-1 text-xs">접속</TabsTrigger>
          <TabsTrigger value="content" className="flex-1 text-xs">콘텐츠</TabsTrigger>
          <TabsTrigger value="members" className="flex-1 text-xs">회원</TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 text-xs">활동 로그</TabsTrigger>
        </TabsList>

        {/* 접속 통계 */}
        <TabsContent value="visitors">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                일별 접속 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.dailyVisitors.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.dailyVisitors}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)} // MM-DD
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(v) => `${v}`}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line
                      type="monotone"
                      dataKey="uniqueUsers"
                      name="방문자"
                      stroke="hsl(15, 90%, 55%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="totalViews"
                      name="페이지뷰"
                      stroke="hsl(200, 70%, 50%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="접속 데이터가 아직 없습니다." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 콘텐츠 사용 */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                기능별 사용 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.contentUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.contentUsage.map((c) => ({
                      name: ACTION_LABELS[c._id] || c._id,
                      count: c.count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" name="사용 횟수" fill="hsl(15, 90%, 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="콘텐츠 사용 데이터가 없습니다." />
              )}
            </CardContent>
          </Card>

          {/* 일정 지역별 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                일정 생성 지역
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.schedulesByRegion.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={data.schedulesByRegion.map((r) => ({
                        name: r._id || "미지정",
                        value: r.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                      dataKey="value"
                    >
                      {data.schedulesByRegion.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="일정 데이터가 없습니다." />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 회원 목록 */}
        <TabsContent value="members">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                가입자 목록 ({data.members.length}명)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {member.profile_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={member.profile_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{member.name}</span>
                      {member.is_admin && (
                        <Badge variant="default" className="text-[10px] px-1 py-0">관리자</Badge>
                      )}
                      {member.kakao_id && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">카카오</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[10px] text-muted-foreground">
                      {formatDate(member.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 활동 로그 */}
        <TabsContent value="activity">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                최근 활동
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data.recentActivity.length > 0 ? (
                data.recentActivity.map((log, i) => {
                  const IconComp = ACTION_ICONS[log.action] || Activity;
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-xs"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <IconComp className="h-3 w-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {log.userName || "비회원"}
                          </span>
                          <span className="text-muted-foreground">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </div>
                        {log.details && Object.keys(log.details).length > 0 && (
                          <p className="text-muted-foreground truncate mt-0.5">
                            {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ")}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  활동 로그가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  sub?: string;
  icon: typeof Users;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value.toLocaleString()}</p>
            {sub && (
              <p className="text-xs text-green-500 mt-0.5">{sub}</p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
      {message}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="pb-24 px-4 space-y-4 pt-4">
      <Skeleton className="h-7 w-40" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-14" />)}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "방금";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch {
    return "";
  }
}
