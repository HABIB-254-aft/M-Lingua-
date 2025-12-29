import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "../components/Header";
import OfflineIndicator from "../components/OfflineIndicator";
import CacheInitializer from "../components/CacheInitializer";
import { ThemeProvider } from "../contexts/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "M-Lingua - Universal Communication Platform",
  description: "M-Lingua: Universal, AI-powered communication platform for deaf, blind, and multilingual users. Speak. Sign. Hear. Understand.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "M-Lingua",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover" as const,
    themeColor: "#2563eb",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem("darkMode");
                  if (saved === "true") {
                    document.documentElement.classList.add("dark");
                  } else {
                    document.documentElement.classList.remove("dark");
                  }
                } catch (e) {
                  document.documentElement.classList.remove("dark");
                }
              })();
            `,
          }}
        />
        <ThemeProvider>
          <CacheInitializer />
          <OfflineIndicator />
          <Header />
          {children}
        </ThemeProvider>
        <Script
          id="service-worker-registration"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('Service Worker registered:', registration.scope);
                      
                      // Check for updates periodically
                      setInterval(function() {
                        registration.update();
                      }, 60000); // Check every minute
                      
                      // Handle service worker updates
                      registration.addEventListener('updatefound', function() {
                        const newWorker = registration.installing;
                        if (newWorker) {
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                              // New service worker available, prompt user to refresh
                              console.log('New service worker available');
                              // Optionally show a notification to the user
                            }
                          });
                        }
                      });
                    })
                    .catch(function(error) {
                      console.log('Service Worker registration failed:', error);
                    });
                  
                  // Listen for messages from service worker
                  navigator.serviceWorker.addEventListener('message', function(event) {
                    if (event.data && event.data.type === 'SW_ACTIVATED') {
                      console.log('Service Worker activated, version:', event.data.version);
                    }
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
