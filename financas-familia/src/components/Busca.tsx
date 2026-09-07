'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

export function Busca({ placeholder = 'Buscar por descrição…' }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [texto, setTexto] = useState(params.get('q') ?? '');
  const [, iniciar] = useTransition();

  useEffect(() => {
    const atual = params.get('q') ?? '';
    if (texto === atual) return;
    const timer = setTimeout(() => {
      const proximos = new URLSearchParams(params.toString());
      if (texto) proximos.set('q', texto);
      else proximos.delete('q');
      const query = proximos.toString();
      iniciar(() => router.replace(query ? `${pathname}?${query}` : pathname));
    }, 250);
    return () => clearTimeout(timer);
  }, [texto, params, pathname, router]);

  return (
    <div className="flex-1">
      <label className="sr-only" htmlFor="busca">
        Buscar lançamentos
      </label>
      <input
        id="busca"
        type="search"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder={placeholder}
        className="min-h-10 w-full rounded-full border bg-surface-1 px-4 text-sm text-ink placeholder:text-ink-3"
      />
    </div>
  );
}
