import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@/design/tokens.css';
import '@/design/components.css';
import './globals.css';

export const metadata: Metadata = { title: 'Путь проводника', description: 'Квест-приложение: доска заказов, карта зоны, персонаж' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#100C08' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Philosopher:ital,wght@0,400;0,700;1,400;1,700&family=Golos+Text:wght@400;500;600;700&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
