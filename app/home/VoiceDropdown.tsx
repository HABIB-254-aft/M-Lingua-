"use client";

import React, { useEffect, useRef, useState } from "react";

export type VoiceOption = {
  value: string;
  label: string;
};

export default function VoiceDropdown({
  id,
  options,
  value,
  onChange,
}: {
  id?: string;
  options: VoiceOption[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        !buttonRef.current ||
        !listRef.current ||
        buttonRef.current.contains(e.target as Node) ||
        listRef.current.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
      setActiveIndex(null);
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const scrollIntoView = (index: number) => {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ block: "nearest" });
  };

  // manage active index when opening/closing via toggle or interactions (avoid calling setState in an effect)
  // activeIndex will be set at the moment dropdown opens or cleared when it closes.

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => {
          const next = i === null ? 0 : Math.min(options.length - 1, i + 1);
          scrollIntoView(next);
          return next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => {
          const next = i === null ? options.length - 1 : Math.max(0, i - 1);
          scrollIntoView(next);
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeIndex !== null) {
          onChange(options[activeIndex].value);
          setOpen(false);
          buttonRef.current?.focus();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(null);
        buttonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, activeIndex, options, onChange]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative inline-block text-left">
      <button
        id={id}
        type="button"
        ref={buttonRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((s) => {
            const next = !s;
            if (next) {
              setActiveIndex(options.findIndex((o) => o.value === value));
            } else {
              setActiveIndex(null);
            }
            return next;
          });
        }}
        className="px-4 py-2 border-2 border-gray-300 rounded-md bg-white text-sm h-10 inline-flex items-center justify-between w-[520px] text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      >
        <span className="truncate">{selected.label}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-2"
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          ref={listRef}
          className="absolute z-50 mt-2 w-[520px] max-h-64 overflow-auto bg-white border-2 border-gray-300 rounded-md text-sm ring-0"
        >
          {options.map((opt, idx) => {
            const isActive = idx === activeIndex;
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                id={`voice-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                className={`cursor-default px-4 py-2 ${
                  isActive ? "bg-blue-600 text-white" : "text-gray-900"
                } ${isSelected && !isActive ? "font-semibold" : ""}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseDown={(e) => {
                  // prevent blur
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);                  setActiveIndex(null);                  buttonRef.current?.focus();
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
