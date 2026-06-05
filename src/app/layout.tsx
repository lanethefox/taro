import type { Metadata } from "next";
import { Geist_Mono, Hanken_Grotesk } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Warm humanist sans for the cozy "tile-builder" reading feel.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "taro",
    template: "%s — taro",
  },
  description:
    "A personal, portable knowledge platform for analytics engineering: wiki, blog & decision log, ERD designer, and data catalog as one knowledge graph.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-grain">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
