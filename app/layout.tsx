import type { Metadata, Viewport } from "next";
import { Cinzel, Space_Grotesk } from "next/font/google";
import "./globals.css";
import "./styles/base.css";
import "./styles/home.css";
import "./styles/resources.css";
import "./styles/viewer.css";

const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["700", "900"], display: "swap" });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"], weight: ["400", "500", "700"], display: "swap" });

export const metadata: Metadata = {
  title: "High Sodium Gaming — Daggerheart table resources",
  description: "Our table's Daggerheart books, searchable on your phone.",
};

export const viewport: Viewport = { themeColor: "#07061A", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${space.variable}`}>
      <body><a className="skip" href="#main">Skip to content</a>{children}</body>
    </html>
  );
}
