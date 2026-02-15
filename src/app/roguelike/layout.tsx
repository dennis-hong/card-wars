'use client';

import { RunContextProvider } from '@/context/run-context';

export default function RoguelikeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RunContextProvider>{children}</RunContextProvider>;
}
