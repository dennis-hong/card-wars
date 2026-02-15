import type { ReactNode } from 'react';

type RoguelikeLayoutProps = {
  children: ReactNode;
};

export default function RoguelikeLayout({ children }: RoguelikeLayoutProps) {
  return <>{children}</>;
}
