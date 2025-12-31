"use client";

import { Suspense } from "react";
import ChatInterfaceContent from "./ChatInterfaceContent";

/**
 * Messages Detail Page
 * 
 * Wrapper with Suspense for useParams compatibility
 */
export default function MessagesDetailPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading chat...</p>
        </div>
      </div>
    }>
      <ChatInterfaceContent />
    </Suspense>
  );
}

