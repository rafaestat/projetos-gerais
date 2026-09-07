'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const ITENS = [
  { href: '/', rotulo: 'Início', icone: '◎' },
  { href: '/transacoes', rotulo: 'Extrato', icone: '☰' },
  { href: '/evolucao', rotulo: 'Evolução', icone: '▤' },
  { href: '/futuro', rotulo: 'Futuro', icone: '↗' },
  { href: '/revisar', rotulo: 'Revisar', icone: '!' },
];

export function Nav() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Preserva base temporal e "incluir transferências" ao trocar de tela.
  const preservados = new URLSearchParams();
  for (const chave of ['base', 'neutros', 'mes'] as const) {
    const valor = params.get(chave);
    if (valor) preservados.set(chave, valor);
  }
  const sufixo = preservados.toString() ? `?${preservados}` : '';

  return (
    <nav
      aria-label="Seções"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-surface-1 sm:static sm:border-t-0 sm:bg-transparent"
    >
      <ul className="mx-auto flex max-w-3xl sm:gap-1">
        {ITENS.map((item) => {
          const ativo =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1 sm:flex-none">
              <Link
                href={`${item.href}${sufixo}`}
                aria-current={ativo ? 'page' : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-3 text-xs sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-full sm:py-2 sm:text-sm ${
                  ativo
                    ? 'text-ink sm:bg-surface-2 font-semibold'
                    : 'text-ink-3 hover:text-ink-2'
                }`}
              >
                <span aria-hidden className="text-base sm:text-sm">
                  {item.icone}
                </span>
                {item.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
