import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/home.css";
import "./styles/resources.css";
import "./styles/viewer.css";

const interTight = localFont({
  variable: "--font-inter-tight",
  display: "swap",
  src: [
    { path: "./fonts/inter-tight-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/inter-tight-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/inter-tight-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
});
const geistMono = localFont({
  variable: "--font-geist-mono",
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/geist-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/geist-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "High Sodium Gaming",
  description: "The Daggerheart Core Rulebook and Hope & Fear. Every page, searchable.",
};

export const viewport: Viewport = { themeColor: "#0d0d0d", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${interTight.variable} ${geistMono.variable}`}>
      <body><a className="skip" href="#main">Skip to content</a>{children}</body>
    </html>
  );
}
