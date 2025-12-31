"use client";

import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import { 
  Mic, 
  Volume2, 
  Hand, 
  Languages, 
  MessageSquare, 
  FileText,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
  iconColor: string;
}

export default function FeaturesPage() {
  const { darkMode } = useTheme();

  // Import features from Quick Access (same as homepage)
  const features: Feature[] = [
    { 
      id: "speech-to-text", 
      title: "Speech to Text", 
      icon: Mic, 
      href: "/home/speech-to-text", 
      color: "blue",
      description: "Convert spoken words into readable text",
      bgColor: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: darkMode ? "text-blue-400" : "text-blue-600"
    },
    { 
      id: "text-to-speech", 
      title: "Text to Speech", 
      icon: Volume2, 
      href: "/home/text-to-speech", 
      color: "purple",
      description: "Hear written text read aloud",
      bgColor: darkMode ? "bg-purple-500/10" : "bg-purple-50",
      iconColor: darkMode ? "text-purple-400" : "text-purple-600"
    },
    { 
      id: "speech-to-sign", 
      title: "Speech to Sign", 
      icon: Hand, 
      href: "/home/speech-to-sign", 
      color: "purple",
      description: "See spoken words in sign language",
      bgColor: darkMode ? "bg-purple-500/10" : "bg-purple-50",
      iconColor: darkMode ? "text-purple-400" : "text-purple-600"
    },
    { 
      id: "conversation-mode", 
      title: "Conversation Mode", 
      icon: MessageSquare, 
      href: "/home/conversation-mode", 
      color: "blue",
      description: "Real-time communication",
      bgColor: darkMode ? "bg-blue-500/10" : "bg-blue-50",
      iconColor: darkMode ? "text-blue-400" : "text-blue-600"
    },
    { 
      id: "translation", 
      title: "Translation", 
      icon: Languages, 
      href: "/home/translation", 
      color: "emerald",
      description: "Translate between languages",
      bgColor: darkMode ? "bg-emerald-500/10" : "bg-emerald-50",
      iconColor: darkMode ? "text-emerald-400" : "text-emerald-600"
    },
    { 
      id: "text-to-sign", 
      title: "Text to Sign", 
      icon: FileText, 
      href: "/home/text-to-sign", 
      color: "purple",
      description: "Convert text to sign language",
      bgColor: darkMode ? "bg-purple-500/10" : "bg-purple-50",
      iconColor: darkMode ? "text-purple-400" : "text-purple-600"
    },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950' : 'bg-slate-50'} transition-colors pb-20`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
              <Sparkles className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`} style={{ fontFamily: 'var(--font-lexend)' }}>
              Features
            </h1>
          </div>
          <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            Explore all the communication tools and features available in M-Lingua
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <Link
                key={feature.id}
                href={feature.href}
                className={`group block p-6 rounded-2xl border transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                  darkMode 
                    ? 'border-slate-800/50 bg-slate-900/50 hover:border-slate-700/50' 
                    : 'border-slate-200/50 bg-white hover:border-slate-300/50'
                } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${feature.bgColor} flex-shrink-0`}>
                    <IconComponent className={`w-6 h-6 ${feature.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50">
                  <span className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Try it now
                  </span>
                  <ArrowRight className={`w-4 h-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'} group-hover:translate-x-1 transition-transform`} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

