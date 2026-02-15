import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { GameStateProvider } from '@/context/GameStateContext';
import { RunContextProvider } from '@/context/run-context';
import BottomTabBar from '@/components/shell/BottomTabBar';
import GameToasts from '@/components/shell/GameToasts';

export const metadata: Metadata = {
  title: 'Warlords: Card Wars',
  description: '5분 컷 삼국지 카드 배틀',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="ko">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#b91c1c" />
        <meta name="application-name" content="삼국쟁패: Card Wars" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Card Wars" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
      </head>
      <body className="antialiased">
        <GameStateProvider>
          <RunContextProvider>
            <GameToasts>
              {children}
              <BottomTabBar />
              <script
                dangerouslySetInnerHTML={{
                  __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(() => {});
                  });
                }
              `,
                }}
              />
            </GameToasts>
          </RunContextProvider>
        </GameStateProvider>
      </body>
    </html>
  );
}
