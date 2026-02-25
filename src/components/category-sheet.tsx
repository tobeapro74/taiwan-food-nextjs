"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useHaptic } from "@/hooks/useHaptic";
import { useLanguage } from "@/components/language-provider";

interface Option {
  id: string;
  name: string;
  nameKey?: string;
  icon: string;
}

interface CategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  options: Option[];
  onSelect: (id: string) => void;
}

export function CategorySheet({ open, onOpenChange, title, options, onSelect }: CategorySheetProps) {
  const { selection } = useHaptic();
  const { t } = useLanguage();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl glass-sheet">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-4 overflow-y-auto flex-1 min-h-0 px-4">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="secondary"
              className="justify-start text-base h-14 transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] bg-white/50 dark:bg-white/10 backdrop-blur-sm"
              onClick={() => {
                selection();
                onSelect(option.id);
                onOpenChange(false);
              }}
            >
              <span className="text-xl mr-3">{option.icon}</span>
              {option.nameKey ? t(option.nameKey) : option.name}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
