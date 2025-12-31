import type { Metadata } from "next";
import { Lexend, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "../components/Header";
import Footer from "../components/Footer";
import OfflineIndicator from "../components/OfflineIndicator";
import CacheInitializer from "../components/CacheInitializer";
import ProductTour from "../components/ProductTour";
import { ThemeProvider } from "../contexts/ThemeContext";
import { OutputPreferencesProvider } from "../contexts/OutputPreferencesContext";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
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
  openGraph: {
    title: "M-Lingua - Universal Communication Platform",
    description: "Universal, AI-powered communication platform for deaf, blind, and multilingual users. Speak. Sign. Hear. Understand.",
    url: "https://m-lingua-alpha.vercel.app",
    siteName: "M-Lingua",
    images: [
      {
        url: "https://m-lingua-alpha.vercel.app/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "M-Lingua Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "M-Lingua - Universal Communication Platform",
    description: "Universal, AI-powered communication platform for deaf, blind, and multilingual users. Speak. Sign. Hear. Understand.",
    images: ["https://m-lingua-alpha.vercel.app/icon-512x512.png"],
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
              className={`${lexend.variable} ${inter.variable} antialiased`}
              style={{ fontFamily: 'var(--font-inter)' }}
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
          <OutputPreferencesProvider>
            <CacheInitializer />
            <OfflineIndicator />
            <Header />
            <main className="pb-20">
              {children}
            </main>
            <Footer />
            <ProductTour />
          </OutputPreferencesProvider>
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
