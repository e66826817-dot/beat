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

// 15 Ekim - 2 Kasım arası otomatik açılır; kullanıcı menüden değiştirebilir
const sezonBetigi = `(function(){try{var s=localStorage.getItem('beat-sezon');var d=new Date();var m=d.getMonth(),g=d.getDate();var a=(m===9&&g>=15)||(m===10&&g<=2);if(s==='1'||(s===null&&a)){document.documentElement.setAttribute('data-season','halloween')}}catch(e){}})()`;

const DEKOR = [
  { e: "🦇", sol: "8%", sure: "17s", gecikme: "0s" },
  { e: "👻", sol: "26%", sure: "23s", gecikme: "5s" },
  { e: "🦇", sol: "45%", sure: "19s", gecikme: "9s" },
  { e: "🎃", sol: "63%", sure: "27s", gecikme: "3s" },
  { e: "🦇", sol: "80%", sure: "21s", gecikme: "12s" },
  { e: "👻", sol: "92%", sure: "25s", gecikme: "7s" },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaBetigi }} />
        <script dangerouslySetInnerHTML={{ __html: sezonBetigi }} />
      </head>
      <body className="min-h-screen pb-28 md:pb-0">
        <div className="sezon-dekor" aria-hidden="true">
          {DEKOR.map((d, i) => (
            <span
              key={i}
              style={{
                left: d.sol,
                animationDuration: d.sure,
                animationDelay: d.gecikme,
              }}
            >
              {d.e}
            </span>
          ))}
        </div>
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}