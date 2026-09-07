'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Descarta o cache do servidor e relê a planilha. */
export function BotaoAtualizar() {
  const router = useRouter();
  const [estado, setEstado] = useState<'ocioso' | 'atualizando' | 'erro'>('ocioso');

  async function atualizar() {
    setEstado('atualizando');
    try {
      const resposta = await fetch('/api/atualizar', { method: 'POST' });
      if (!resposta.ok) throw new Error('falhou');
      router.refresh();
      setEstado('ocioso');
    } catch {
      setEstado('erro');
    }
  }

  return (
    <button
      type="button"
      onClick={atualizar}
      disabled={estado === 'atualizando'}
      className="min-h-9 rounded-full border px-3 text-ink-2 hover:text-ink disabled:opacity-50"
    >
      {estado === 'atualizando'
        ? 'Atualizando…'
        : estado === 'erro'
          ? 'Erro — tentar de novo'
          : 'Atualizar da planilha'}
    </button>
  );
}
