"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface FooterItemProps {
  icon: LucideIcon;
  iconFilled?: LucideIcon; // Optional filled/solid version
  label: string;
  href: string;
  unreadCount?: number;
  onClick?: () => void;
  isActive?: boolean; // Optional override for active state (e.g., for drawers)
}

/**
 * FooterItem Component
 * 
 * A reusable footer navigation item with:
 * - Dynamic unread badge (Emerald Green)
 * - Active state styling (outline to solid icon, blue color, indicator bar)
 * - Framer Motion micro-interactions
 * - Haptic feedback placeholder
 */
export default function FooterItem({
  icon: Icon,
  iconFilled,
  label,
  href,
  unreadCount = 0,
  onClick,
  isActive: isActiveOverride,
}: FooterItemProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Determine if this item is active
  const isActive = isActiveOverride !== undefined 
    ? isActiveOverride 
    : pathname === href || pathname?.startsWith(href);

  // Use filled icon if active and provided, otherwise use outline icon
  const IconComponent = isActive && iconFilled ? iconFilled : Icon;

  // Haptic feedback placeholder
  const triggerHapticFeedback = () => {
    // Check if device supports haptic feedback
    if ('vibrate' in navigator) {
      // Light vibration on tap
      navigator.vibrate(10);
    }
    // For iOS devices, you might want to use HapticFeedback API if available
    // This is a placeholder for future implementation
  };

  const handleClick = () => {
    triggerHapticFeedback();
    
    if (onClick) {
      onClick();
    } else {
      router.push(href);
    }
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.9 }}
      className={`relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        isActive
          ? 'text-[#3B82F6] dark:text-blue-400'
          : 'text-slate-600 dark:text-slate-400 hover:text-[#3B82F6] dark:hover:text-blue-400'
      }`}
      aria-label={label}
      title={label}
    >
      {/* Icon with Unread Badge */}
      <div className="relative">
        <IconComponent 
          className={`w-6 h-6 ${isActive ? 'text-[#3B82F6] dark:text-blue-400' : ''}`}
          strokeWidth={isActive ? 2.5 : 1.5}
          fill={isActive && iconFilled ? 'currentColor' : (isActive ? 'currentColor' : 'none')}
        />
        
        {/* Unread Badge - Emerald Green */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </div>

      {/* Label */}
      <span className={`text-xs font-medium ${isActive ? 'text-[#3B82F6] dark:text-blue-400' : ''}`}>
        {label}
      </span>

      {/* Active State Indicator - 2px horizontal bar */}
      {isActive && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3B82F6] dark:bg-blue-400 rounded-t-full"
        />
      )}

      {/* Alternative: Glowing dot indicator (commented out, can be enabled instead of bar) */}
      {/* {isActive && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#3B82F6] dark:bg-blue-400 rounded-full shadow-lg shadow-blue-500/50"
        />
      )} */}
    </motion.button>
  );
}

