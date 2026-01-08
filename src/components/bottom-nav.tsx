"use client";

import { Home, Grid3X3, Store, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type TabType = "home" | "category" | "market" | "tour" | "places";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const navItems = [
  { id: "home" as const, label: "홈", icon: Home },
  { id: "category" as const, label: "카테고리", icon: Grid3X3 },
  { id: "market" as const, label: "야시장", icon: Store },
  { id: "tour" as const, label: "도심투어", icon: MapPin },
  { id: "places" as const, label: "명소", icon: Star },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50">
      <div className="max-w-md mx-auto flex justify-around items-center py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all hover:scale-[1.1] active:scale-[0.95]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", isActive && "fill-primary/20")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
