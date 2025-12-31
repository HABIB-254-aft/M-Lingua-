"use client";

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export default function SkeletonText({ lines = 3, className = "" }: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-label="Loading content">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded animate-shimmer bg-[length:1000px_100%]"
          style={{
            width: index === lines - 1 ? '75%' : '100%',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

