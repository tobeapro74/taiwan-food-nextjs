'use client';

import { useRef, memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Restaurant } from '@/lib/types';

/**
 * Virtual Scroll 맛집 목록
 * - 대량의 맛집 목록을 효율적으로 렌더링
 * - 화면에 보이는 항목만 DOM에 렌더링
 */

interface VirtualRestaurantListProps {
  restaurants: Restaurant[];
  onSelect: (restaurant: Restaurant) => void;
  renderItem: (restaurant: Restaurant, index: number) => React.ReactNode;
  itemHeight?: number;
  overscan?: number;
  className?: string;
}

function VirtualRestaurantListComponent({
  restaurants,
  renderItem,
  itemHeight = 180,
  overscan = 5,
  className = '',
}: VirtualRestaurantListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: restaurants.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`h-[calc(100vh-200px)] overflow-auto ${className}`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(restaurants[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export const VirtualRestaurantList = memo(VirtualRestaurantListComponent);

/**
 * 2열 그리드 Virtual Scroll
 */
interface VirtualGridProps {
  restaurants: Restaurant[];
  onSelect: (restaurant: Restaurant) => void;
  renderItem: (restaurant: Restaurant, index: number) => React.ReactNode;
  rowHeight?: number;
  overscan?: number;
  className?: string;
}

function VirtualGridComponent({
  restaurants,
  renderItem,
  rowHeight = 220,
  overscan = 3,
  className = '',
}: VirtualGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // 2열 그리드를 위해 행 단위로 그룹화
  const rows = useMemo(() => {
    const result: Restaurant[][] = [];
    for (let i = 0; i < restaurants.length; i += 2) {
      result.push(restaurants.slice(i, i + 2));
    }
    return result;
  }, [restaurants]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`h-[calc(100vh-200px)] overflow-auto ${className}`}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const row = rows[virtualItem.index];
          const baseIndex = virtualItem.index * 2;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="grid grid-cols-2 gap-3 px-4"
            >
              {row.map((restaurant, colIndex) => (
                <div key={restaurant.name || colIndex}>
                  {renderItem(restaurant, baseIndex + colIndex)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const VirtualGrid = memo(VirtualGridComponent);

/**
 * 성능 최적화된 맛집 카드 래퍼
 */
interface OptimizedCardProps {
  restaurant: Restaurant;
  index: number;
  onSelect: (restaurant: Restaurant) => void;
  children: React.ReactNode;
}

export const OptimizedCard = memo(function OptimizedCard({
  children,
}: OptimizedCardProps) {
  return <>{children}</>;
}, (prevProps, nextProps) => {
  // 맛집 이름이 같으면 리렌더링 방지
  return prevProps.restaurant.name === nextProps.restaurant.name &&
         prevProps.index === nextProps.index;
});
