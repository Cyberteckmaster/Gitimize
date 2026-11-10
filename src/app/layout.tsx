import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  preload: true,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  preload: true,
});

export const metadata: Metadata = {
  title: {
    default: "ShipOS — The Universal Submission Engine",
    template: "%s | ShipOS",
  },
  description: "One URL. Every Artifact. Zero Lies. Turn a GitHub repo into a complete, provenance-verified launch kit: audited README, 100/100 SEO/AEO/GEO, 5-min demo film, 4K renders, competitor radar.",
  keywords: [
    "GitHub", "repository", "audit", "README", "SEO", "AEO", "GEO",
    "demo video", "render", "4K", "competitor analysis", "launch kit",
    "developer tools", "open source", "documentation",
  ],
  authors: [{ name: "ShipOS Team" }],
  creator: "ShipOS",
  publisher: "ShipOS",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://shipos.dev",
    siteName: "ShipOS",
    title: "ShipOS — The Universal Submission Engine",
    description: "One URL. Every Artifact. Zero Lies. Complete launch kit from any GitHub repo.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ShipOS - Universal Submission Engine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@shipos",
    creator: "@shipos",
    title: "ShipOS — The Universal Submission Engine",
    description: "One URL. Every Artifact. Zero Lies.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "google-site-verification-code",
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} scrollbar-thin`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://github.com" />
        <link rel="dns-prefetch" href="https://api.github.com" />
        <link rel="dns-prefetch" href="https://opengraph.githubassets.com" />
      </head>
      <body className="min-h-screen bg-background text-on-surface antialiased">
        {children}
      </body>
    </html>
  );
}