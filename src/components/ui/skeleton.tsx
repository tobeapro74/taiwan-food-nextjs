import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

/**
 * 맛집 카드 Skeleton
 */
function RestaurantCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border bg-white dark:bg-gray-800 shadow-sm">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

/**
 * 맛집 목록 Skeleton
 */
function RestaurantListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <RestaurantCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 홈 화면 Skeleton
 */
function HomePageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <RestaurantCardSkeleton />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-28" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <RestaurantCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 리뷰 아이템 Skeleton
 */
function ReviewSkeleton() {
  return (
    <div className="space-y-2 p-3 border rounded-lg">
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

/**
 * 리뷰 목록 Skeleton
 */
function ReviewListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <ReviewSkeleton key={i} />
      ))}
    </div>
  );
}

export {
  Skeleton,
  RestaurantCardSkeleton,
  RestaurantListSkeleton,
  HomePageSkeleton,
  ReviewSkeleton,
  ReviewListSkeleton,
}
