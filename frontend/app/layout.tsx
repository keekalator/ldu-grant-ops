import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";
import HelpButton from "@/components/shared/HelpButton";
import AIChatButton from "@/components/shared/AIChatButton";
import CursorGlow from "@/components/shared/CursorGlow";
import { UserProvider } from "@/lib/user-context";

export const metadata: Metadata = {
  title: "LDU Grant Ops",
  description: "Life Development University — Grant Management Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LDU Grants",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: "/icons/icon-192.png",
  },
  openGraph: {
    title: "LDU Grant Ops",
    description: "Grant management for Life Development University",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1565e8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Press+Start+2P&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-[#1565e8] text-[#0a0a1a] antialiased">
        <UserProvider>
          <CursorGlow />
          <main className="relative">
            {children}
          </main>
          <HelpButton />
          <AIChatButton />
          <BottomNav />
        </UserProvider>
      </body>
    </html>
  );
}
