"use client";

import { useState, ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: string;
  className?: string;
}

export default function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  icon,
  className = "",
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-expanded={isOpen}
        aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`}
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="font-medium text-gray-900 dark:text-gray-100">{title}</span>
        </div>
        <span className="text-gray-500 dark:text-gray-400 transform transition-transform">
          {isOpen ? "▼" : "▶"}
        </span>
      </button>
      {isOpen && (
        <div className="p-4 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
  );
}

