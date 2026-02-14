import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GameStateProvider } from '@/context/GameStateContext';
import GameToasts from '@/components/shell/GameToasts';

export const metadata: Metadata = {
  title: "Warlords: Card Wars",
  description: "5분 컷 삼국지 카드 배틀",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <GameStateProvider>
          <GameToasts>
            {children}
          </GameToasts>
        </GameStateProvider>
      </body>
    </html>
  );
}
