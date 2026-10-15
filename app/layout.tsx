import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Beat",
  description: "Yeni nesil boyband ve girlband'lerin buluşma noktası",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0a10",
};

const temaBetigi = `(function(){try{var t=localStorage.getItem('beat-tema');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaBetigi }} />
      </head>
      <body className="min-h-screen pb-28 md:pb-0">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}