import { BotaoAtualizar } from './BotaoAtualizar';

const FONTE = {
  api: 'planilha do Google (conta de serviço)',
  public: 'planilha do Google (link público)',
  fixture: 'dados de exemplo — nenhuma planilha conectada',
} as const;

interface Props {
  fonte: keyof typeof FONTE;
  atualizadoEm: string;
  quantidade: number;
}

export function Rodape({ fonte, atualizadoEm, quantidade }: Props) {
  const hora = new Date(atualizadoEm).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-ink-3">
      <p>
        Fonte: {FONTE[fonte]} · {quantidade.toLocaleString('pt-BR')} lançamentos ·
        lido em {hora}
      </p>
      <BotaoAtualizar />
    </footer>
  );
}
