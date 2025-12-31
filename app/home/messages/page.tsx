"use client";

import { Suspense } from "react";
import MessagesPageContent from "./MessagesPageContent";

/**
 * Messages Page
 * 
 * Wrapper with Suspense for useSearchParams compatibility
 */
export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading messages...</p>
        </div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}
