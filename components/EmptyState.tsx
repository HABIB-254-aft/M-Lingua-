"use client";

import { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  iconSize?: "64" | "80";
  iconColor?: "blue" | "green" | "purple" | "orange";
}

export default function EmptyState({
  icon,
  title,
  description,
  actionButton,
  className = "",
  iconSize = "64",
  iconColor = "blue",
}: EmptyStateProps) {
  const sizeClasses = {
    "64": "w-16 h-16",
    "80": "w-20 h-20",
  };

  const colorClasses = {
    blue: "text-blue-300 dark:text-blue-500/40",
    green: "text-emerald-300 dark:text-emerald-500/40",
    purple: "text-purple-300 dark:text-purple-500/40",
    orange: "text-orange-300 dark:text-orange-500/40",
  };

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 max-w-sm mx-auto transition-opacity duration-300 ${className}`}>
      <div className={`mb-4 ${sizeClasses[iconSize]} ${colorClasses[iconColor]} flex items-center justify-center`} aria-hidden="true">
        {icon}
      </div>
      <h3 className={`text-lg font-semibold mb-2 text-center text-slate-900 dark:text-slate-100`} style={{ fontFamily: 'var(--font-lexend)' }}>
        {title}
      </h3>
      <p className={`text-sm text-center mb-6 text-slate-600 dark:text-slate-400`} style={{ fontFamily: 'var(--font-inter)' }}>
        {description}
      </p>
      {actionButton && (
        <button
          type="button"
          onClick={actionButton.onClick}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 font-medium text-sm"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          {actionButton.label}
        </button>
      )}
    </div>
  );
}

