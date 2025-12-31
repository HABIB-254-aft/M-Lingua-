"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, ArrowRight } from "lucide-react";

interface TourStep {
  id: string;
  selector: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "quick-access",
    selector: "[data-tour='quick-access']",
    title: "Start here!",
    description: "Convert speech to text or sign language instantly.",
    position: "bottom",
  },
  {
    id: "messages-footer",
    selector: "[data-tour='messages-footer']",
    title: "Stay connected",
    description: "Your chats and friends are always one tap away.",
    position: "top",
  },
  {
    id: "profile-header",
    selector: "[data-tour='profile-header']",
    title: "Manage your account",
    description: "Manage your account and accept new connections here.",
    position: "bottom",
  },
];

export default function ProductTour() {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only show tour on homepage
    if (pathname !== "/home") {
      return;
    }

    // Check if user has seen the tour
    if (typeof window === "undefined") return;

    const hasSeenTour = localStorage.getItem("mlingua_hasSeenTour");
    if (hasSeenTour !== "true") {
      // Wait for page to load, then start tour
      const timer = setTimeout(() => {
        setCurrentStep(0);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  useEffect(() => {
    if (currentStep === null) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) {
      // Tour complete
      localStorage.setItem("mlingua_hasSeenTour", "true");
      setCurrentStep(null);
      return;
    }

    // Find the element to highlight - retry if not found
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const findElement = (retries = 0): void => {
      const element = document.querySelector(step.selector) as HTMLElement;
      if (!element) {
        if (retries < 10) {
          // Retry after a short delay (element might still be loading)
          setTimeout(() => findElement(retries + 1), 200);
        } else {
          // Element not found after retries, skip to next step
          if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
          } else {
            // Last step, complete tour
            localStorage.setItem("mlingua_hasSeenTour", "true");
            setCurrentStep(null);
          }
        }
        return;
      }

      // Element found, proceed with highlighting
      // Scroll element into view
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

      // Wait for scroll to complete, then calculate positions
      scrollTimer = setTimeout(() => {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);

        // Calculate tooltip position based on step position preference
        const tooltipWidth = 320; // Approximate tooltip width
        const tooltipHeight = 150; // Approximate tooltip height
        const spacing = 20;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case "top":
            top = rect.top - tooltipHeight - spacing;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case "bottom":
            top = rect.bottom + spacing;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case "left":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - spacing;
            break;
          case "right":
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + spacing;
            break;
          default:
            // Center (fallback)
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
        }

        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) left = viewportWidth - tooltipWidth - 10;
        if (top < 10) top = 10;
        if (top + tooltipHeight > viewportHeight - 10) top = viewportHeight - tooltipHeight - 10;

        setTooltipPosition({ top, left });

        // Auto-focus tooltip for screen readers after a brief delay
        setTimeout(() => {
          if (tooltipRef.current) {
            tooltipRef.current.focus();
          }
        }, 100);
      }, 500);
    };

    // Start finding the element
    findElement();

    // Cleanup function
    return () => {
      if (scrollTimer) {
        clearTimeout(scrollTimer);
      }
    };
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep !== null && currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Tour complete
      localStorage.setItem("mlingua_hasSeenTour", "true");
      setCurrentStep(null);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("mlingua_hasSeenTour", "true");
    setCurrentStep(null);
  };

  if (currentStep === null || highlightRect === null || tooltipPosition === null) {
    return null;
  }

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Calculate viewport dimensions
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;

  return (
    <>
      {/* Highlight border - subtle, non-blocking */}
      <div
        className="fixed z-[9999] pointer-events-none border-4 border-blue-500 rounded-xl transition-all duration-300 animate-pulse"
        style={{
          left: `${highlightRect.left - 10}px`,
          top: `${highlightRect.top - 10}px`,
          width: `${highlightRect.width + 20}px`,
          height: `${highlightRect.height + 20}px`,
          boxShadow: `0 0 0 4px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)`,
        }}
        aria-hidden="true"
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-description"
        aria-live="polite"
        className="fixed z-[10000] bg-blue-900 text-white rounded-xl shadow-2xl p-6 max-w-sm animate-fade-in focus:outline-none"
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
        }}
        tabIndex={0}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 id="tour-title" className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-lexend)' }}>
              {step.title}
            </h3>
            <p id="tour-description" className="text-blue-100 text-sm" style={{ fontFamily: 'var(--font-inter)' }}>
              {step.description}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="ml-4 text-white/70 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900 rounded"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-blue-200">
            {currentStep + 1} of {TOUR_STEPS.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900 rounded"
            >
              Skip Tour
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-white text-blue-900 text-sm font-semibold rounded-lg hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-900 flex items-center gap-2"
              autoFocus
            >
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

