"use client";

import { Home, Grid3X3, Store, Navigation, PlusCircle, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "home" | "category" | "market" | "tour" | "places" | "nearby" | "add" | "schedule";

interface User {
  id: number;
  name: string;
  is_admin: boolean;
}

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  user?: User | null;
}

const navItems = [
  { id: "home" as const, label: "홈", icon: Home },
  { id: "nearby" as const, label: "주변맛집", icon: Navigation },
  { id: "schedule" as const, label: "일정", icon: CalendarDays },
  { id: "add" as const, label: "등록", icon: PlusCircle, adminOnly: true },
  { id: "category" as const, label: "카테고리", icon: Grid3X3 },
  { id: "market" as const, label: "야시장", icon: Store },
];

// 등록 권한 체크 (관리자 또는 박병철)
const canAddRestaurant = (user?: User | null): boolean => {
  if (!user) return false;
  return user.is_admin || user.name === "박병철";
};

export function BottomNav({ activeTab, onTabChange, user }: BottomNavProps) {
  // 권한에 따라 보여줄 메뉴 필터링
  const visibleItems = navItems.filter((item) => {
    if (item.adminOnly) {
      return canAddRestaurant(user);
    }
    return true;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-[90]">
      <div className="max-w-md mx-auto flex justify-around items-center py-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[52px] px-2 py-1.5 rounded-lg transition-all duration-200 active:scale-[0.95]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-12 h-7 rounded-full transition-all duration-200",
                isActive
                  ? "bg-primary/12"
                  : "bg-transparent"
              )}>
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive && "fill-primary/25 scale-105"
                  )}
                />
              </div>
              <span className={cn(
                "text-xs transition-all duration-200",
                isActive ? "font-semibold" : "font-medium"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
