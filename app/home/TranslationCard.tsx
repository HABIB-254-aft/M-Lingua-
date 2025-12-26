"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function TranslationCard() {
  const router = useRouter();

  const activate = (e?: React.MouseEvent | React.KeyboardEvent) => {
    try {
      router.push("/home/translation");
    } catch (err) {
      // ignore navigation errors in dev
      console.error(err);
    }
  };

  return (
    <article
      // preserve visual classes; add tabindex/role and focus styles for accessibility
      tabIndex={0}
      role="link"
      onClick={(e) => activate(e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "\r") {
          e.preventDefault();
          activate(e);
        }
        // Support Space to activate as well
        if (e.key === " " || e.key === "Spacebar" || e.code === "Space") {
          e.preventDefault();
          activate(e);
        }
      }}
      className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-white dark:bg-gray-800 hover:border-blue-500 dark:hover:border-blue-400 focus-visible:border-blue-500 focus-visible:outline-none"
    >
      <div className="text-3xl mb-4">🌍</div>
      <div className="text-lg font-medium text-gray-900 dark:text-gray-100">Translation</div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Translate between multiple languages</p>
    </article>
  );
}

