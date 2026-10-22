import { Suspense, type ReactNode } from 'react';
import { GameProvider } from '@/components/GameProvider';
import { Header } from '@/components/Header';
import { Sheet } from '@/components/Sheet';

export default function GameLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <GameProvider>
        <Header />
        <main className="gutter">{children}</main>
        <Sheet />
      </GameProvider>
    </Suspense>
  );
}
