"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface Option {
  id: string;
  name: string;
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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-4">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="secondary"
              className="justify-start text-base h-14 transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
              onClick={() => {
                onSelect(option.id);
                onOpenChange(false);
              }}
            >
              <span className="text-xl mr-3">{option.icon}</span>
              {option.name}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
