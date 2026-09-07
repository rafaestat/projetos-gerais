'use client';

import { useState } from 'react';

import type { PontoMensal } from '@/lib/analytics';
import { formatBRL, formatBRLEixo, formatCompetenciaCurta } from '@/lib/format';

import { TabelaDados } from './TabelaDados';
import { caminhoBarra, ticksDeValor } from './geometria';
import { useLargura } from './useLargura';

const ALTURA = 260;
const MARGEM = { top: 16, right: 20, bottom: 34, left: 66 };
const LARGURA_MAX_BARRA = 24;
const VAO = 2; // o "surface gap" entre as duas colunas encostadas

interface Props {
  dados: PontoMensal[];
  mesDestacado?: string;
}

export function GraficoMensal({ dados, mesDestacado }: Props) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);

  if (dados.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-3">Sem dados suficientes.</p>;
  }

  const larguraMinima = MARGEM.left + MARGEM.right + dados.length * 44;
  const w = Math.max(largura, larguraMinima);
  const areaW = w - MARGEM.left - MARGEM.right;
  const areaH = ALTURA - MARGEM.top - MARGEM.bottom;
  const baseY = MARGEM.top + areaH;

  const maximo = Math.max(
    ...dados.flatMap((ponto) => [ponto.receitas, ponto.despesas]),
    1,
  );
  const ticks = ticksDeValor(maximo);
  const topo = ticks[ticks.length - 1];
  const escala = (valor: number) => (valor / topo) * areaH;

  const banda = areaW / dados.length;
  const larguraBarra = Math.min(LARGURA_MAX_BARRA, (banda - VAO) / 2 - 6);
  // Com muitas colunas, rotular todo mês vira ruído: mostramos um sim, um
  // não, sempre preservando o primeiro e o último.
  const passoRotulo = banda < 46 ? 2 : 1;
  const rotulavel = (indice: number) =>
    indice % passoRotulo === 0 || indice === dados.length - 1;

  const ponto = ativo != null ? dados[ativo] : null;
  const centroAtivo = ativo != null ? MARGEM.left + banda * (ativo + 0.5) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 pb-2 text-sm text-ink-2">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--entrada)' }}
          />
          Receitas
        </span>
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--saida)' }}
          />
          Despesas
        </span>
      </div>

      <div ref={ref} className="relative overflow-x-auto">
        <svg
          width={w}
          height={ALTURA}
          role="img"
          aria-label="Receitas e despesas por mês"
          onMouseLeave={() => setAtivo(null)}
        >
          {ticks.map((tick) => {
            const y = baseY - escala(tick);
            return (
              <g key={tick}>
                <line
                  x1={MARGEM.left}
                  x2={w - MARGEM.right}
                  y1={y}
                  y2={y}
                  stroke={tick === 0 ? 'var(--axis)' : 'var(--grid)'}
                  strokeWidth={1}
                />
                <text
                  x={MARGEM.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--text-muted)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatBRLEixo(tick)}
                </text>
              </g>
            );
          })}

          {dados.map((item, indice) => {
            const centro = MARGEM.left + banda * (indice + 0.5);
            const xReceita = centro - larguraBarra - VAO / 2;
            const xDespesa = centro + VAO / 2;
            const destaque = item.mes === mesDestacado;

            return (
              <g key={item.mes}>
                {(destaque || ativo === indice) && (
                  <rect
                    x={MARGEM.left + banda * indice}
                    y={MARGEM.top}
                    width={banda}
                    height={areaH}
                    fill="var(--surface-2)"
                    opacity={ativo === indice ? 0.9 : 0.55}
                  />
                )}
                <path
                  d={caminhoBarra(
                    xReceita,
                    baseY - escala(item.receitas),
                    larguraBarra,
                    escala(item.receitas),
                  )}
                  fill="var(--entrada)"
                />
                <path
                  d={caminhoBarra(
                    xDespesa,
                    baseY - escala(item.despesas),
                    larguraBarra,
                    escala(item.despesas),
                  )}
                  fill="var(--saida)"
                />
                <text
                  x={centro}
                  y={ALTURA - 12}
                  textAnchor="middle"
                  opacity={rotulavel(indice) ? 1 : 0}
                  fontSize={11}
                  fill={destaque ? 'var(--text-primary)' : 'var(--text-muted)'}
                  fontWeight={destaque ? 600 : 400}
                >
                  {formatCompetenciaCurta(item.mes)}
                </text>
                <rect
                  x={MARGEM.left + banda * indice}
                  y={MARGEM.top}
                  width={banda}
                  height={areaH}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatCompetenciaCurta(item.mes)}: receitas ${formatBRL(item.receitas)}, despesas ${formatBRL(item.despesas)}, saldo ${formatBRL(item.saldo)}`}
                  onMouseEnter={() => setAtivo(indice)}
                  onFocus={() => setAtivo(indice)}
                  onBlur={() => setAtivo(null)}
                />
              </g>
            );
          })}
        </svg>

        {ponto && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-10 w-44 rounded-lg border bg-surface-1 p-3 text-sm shadow-sm"
            style={{
              left: Math.min(Math.max(centroAtivo - 88, 4), w - 180),
            }}
          >
            <div className="font-semibold text-ink">
              {formatCompetenciaCurta(ponto.mes)}
            </div>
            <dl className="mt-1 flex flex-col gap-1 numeros-alinhados">
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-ink-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: 'var(--entrada)' }}
                  />
                  Receitas
                </dt>
                <dd className="text-ink">{formatBRL(ponto.receitas)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-1.5 text-ink-2">
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: 'var(--saida)' }}
                  />
                  Despesas
                </dt>
                <dd className="text-ink">{formatBRL(ponto.despesas)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 border-t pt-1">
                <dt className="text-ink-2">Saldo</dt>
                <dd
                  className="font-semibold"
                  style={{
                    color:
                      ponto.saldo >= 0
                        ? 'var(--texto-positivo)'
                        : 'var(--status-critical)',
                  }}
                >
                  {formatBRL(ponto.saldo)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      <TabelaDados
        titulo="Receitas, despesas e saldo por mês"
        colunas={['Mês', 'Receitas', 'Despesas', 'Saldo']}
        linhas={dados.map((item) => [
          formatCompetenciaCurta(item.mes),
          formatBRL(item.receitas),
          formatBRL(item.despesas),
          formatBRL(item.saldo),
        ])}
      />
    </div>
  );
}
