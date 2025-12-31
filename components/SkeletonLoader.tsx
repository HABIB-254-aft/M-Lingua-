"use client";

interface SkeletonLoaderProps {
  count?: number;
  className?: string;
}

/**
 * SkeletonLoader Component
 * 
 * Shimmering skeleton loader for loading states
 */
export default function SkeletonLoader({ count = 3, className = "" }: SkeletonLoaderProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-4 py-3 animate-pulse"
        >
          {/* Avatar skeleton */}
          <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
          
          {/* Button skeleton */}
          <div className="w-20 h-9 bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

