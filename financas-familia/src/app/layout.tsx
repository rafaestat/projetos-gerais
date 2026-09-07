import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

import { Nav } from '@/components/Nav';
import { ThemeToggle } from '@/components/ThemeToggle';

import './globals.css';

export const metadata: Metadata = {
  title: 'Finanças da Casa',
  description:
    'Painel do orçamento da família, lido direto da planilha que é a fonte da verdade.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#0d0d0d' },
  ],
};

// Aplica o tema salvo antes da primeira pintura, para não piscar branco.
const TEMA_INICIAL = `try{var t=localStorage.getItem('tema');if(t&&t!=='system')document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_INICIAL }} />
      </head>
      <body className="min-h-dvh pb-20 sm:pb-8">
        <header className="border-b bg-surface-1">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-base font-semibold text-ink">Finanças da Casa</p>
              <p className="text-xs text-ink-3">Orçamento da família em um lugar só</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="mx-auto hidden max-w-3xl px-2 pb-2 sm:block">
            <Suspense fallback={null}>
              <Nav />
            </Suspense>
          </div>
        </header>

        <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-5">
          {children}
        </main>

        <div className="sm:hidden">
          <Suspense fallback={null}>
            <Nav />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
