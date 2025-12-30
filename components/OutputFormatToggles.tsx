"use client";

import { useOutputPreferences } from "../contexts/OutputPreferencesContext";

interface OutputFormatTogglesProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export default function OutputFormatToggles({
  className = "",
  showLabel = true,
  compact = false,
}: OutputFormatTogglesProps) {
  const { preferences, updatePreference } = useOutputPreferences();

  const toggles = [
    { key: "showText" as const, label: "Text", icon: "📝" },
    { key: "showSign" as const, label: "Sign Language", icon: "🙏" },
    { key: "showAudio" as const, label: "Audio", icon: "🔊" },
    { key: "showTranslation" as const, label: "Translation", icon: "🌐" },
  ];

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Show Outputs:
        </label>
      )}
      <div className={`flex ${compact ? "gap-2" : "gap-3"} flex-wrap`}>
        {toggles.map((toggle) => (
          <label
            key={toggle.key}
            className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 cursor-pointer transition-colors ${
              preferences[toggle.key]
                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-400 text-blue-700 dark:text-blue-300"
                : "bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
            } hover:border-blue-400 dark:hover:border-blue-500`}
          >
            <input
              type="checkbox"
              checked={preferences[toggle.key]}
              onChange={(e) => updatePreference(toggle.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span className="text-sm font-medium flex items-center gap-1.5">
              <span>{toggle.icon}</span>
              {!compact && <span>{toggle.label}</span>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

