'use client';

import { useId, useState } from 'react';

interface Props {
  titulo: string;
  colunas: string[];
  linhas: (string | number)[][];
}

/**
 * A "gêmea em tabela" de cada gráfico: todo valor plotado também é legível
 * como texto, sem depender de cor nem de passar o mouse.
 */
export function TabelaDados({ titulo, colunas, linhas }: Props) {
  const [aberta, setAberta] = useState(false);
  const id = useId();

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setAberta((atual) => !atual)}
        aria-expanded={aberta}
        aria-controls={id}
        className="min-h-9 text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
      >
        {aberta ? 'Ocultar tabela' : 'Ver como tabela'}
      </button>
      <div id={id} hidden={!aberta} className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm numeros-alinhados">
          <caption className="sr-only">{titulo}</caption>
          <thead>
            <tr className="border-b text-left text-ink-2">
              {colunas.map((coluna, indice) => (
                <th
                  key={coluna}
                  scope="col"
                  className={`py-2 font-medium ${indice === 0 ? '' : 'text-right'}`}
                >
                  {coluna}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha) => (
              <tr key={String(linha[0])} className="border-b last:border-0">
                {linha.map((celula, indice) => (
                  <td
                    key={indice}
                    className={`py-2 ${indice === 0 ? 'text-ink' : 'text-right text-ink-2'}`}
                  >
                    {celula}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
