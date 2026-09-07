'use client';

import { useState } from 'react';

import type { PontoMensal } from '@/lib/analytics';
import { formatBRL, formatBRLEixo, formatCompetenciaCurta } from '@/lib/format';

import { TabelaDados } from './TabelaDados';
import { caminhoBarra, ticksDeValor } from './geometria';
import { useLargura } from './useLargura';

const ALTURA = 220;
const MARGEM = { top: 16, right: 20, bottom: 34, left: 66 };
const LARGURA_MAX_BARRA = 24;

interface Props {
  dados: PontoMensal[];
  mesDestacado?: string;
}

/**
 * Saldo do mês — série única, divergente pelo sinal: azul acima da linha do
 * zero (sobrou), vermelho abaixo (faltou). Sem legenda: a linha do zero e os
 * rótulos já dizem o que é.
 */
export function GraficoSaldo({ dados, mesDestacado }: Props) {
  const { ref, largura } = useLargura<HTMLDivElement>();
  const [ativo, setAtivo] = useState<number | null>(null);

  if (dados.length === 0) {
    return <p className="py-6 text-center text-sm text-ink-3">Sem dados suficientes.</p>;
  }

  const larguraMinima = MARGEM.left + MARGEM.right + dados.length * 38;
  const w = Math.max(largura, larguraMinima);
  const areaW = w - MARGEM.left - MARGEM.right;
  const areaH = ALTURA - MARGEM.top - MARGEM.bottom;

  const maiorPositivo = Math.max(0, ...dados.map((ponto) => ponto.saldo));
  const maiorNegativo = Math.max(0, ...dados.map((ponto) => -ponto.saldo));
  const ticksPositivos = ticksDeValor(maiorPositivo, 2);
  const ticksNegativos = ticksDeValor(maiorNegativo, 2);
  const topo = ticksPositivos[ticksPositivos.length - 1] || 0;
  const fundo = ticksNegativos[ticksNegativos.length - 1] || 0;
  const amplitude = topo + fundo || 1;

  const zeroY = MARGEM.top + (topo / amplitude) * areaH;
  const escala = (valor: number) => (Math.abs(valor) / amplitude) * areaH;

  const banda = areaW / dados.length;
  const larguraBarra = Math.min(LARGURA_MAX_BARRA, banda - 12);
  // O zero sempre entra; marcas que cairiam a menos de 18px de outra são
  // descartadas, senão os rótulos das duas metades se sobrepõem perto da base.
  const candidatas = [
    ...ticksPositivos.filter((tick) => tick !== 0),
    0,
    ...ticksNegativos.filter((tick) => tick !== 0).map((tick) => -tick),
  ];
  const alturaDa = (marca: number) =>
    zeroY - (marca >= 0 ? escala(marca) : -escala(marca));
  const marcas = candidatas.filter((marca, indice) => {
    if (marca === 0) return true;
    return candidatas
      .slice(0, indice)
      .every((outra) => Math.abs(alturaDa(marca) - alturaDa(outra)) >= 18);
  });
  // Com muitas colunas, rotular todo mês vira ruído: mostramos um sim, um
  // não, sempre preservando o primeiro e o último.
  const passoRotulo = banda < 46 ? 2 : 1;
  const rotulavel = (indice: number) =>
    indice % passoRotulo === 0 || indice === dados.length - 1;

  const ponto = ativo != null ? dados[ativo] : null;

  return (
    <div>
      <div ref={ref} className="relative overflow-x-auto">
        <svg
          width={w}
          height={ALTURA}
          role="img"
          aria-label="Saldo por mês"
          onMouseLeave={() => setAtivo(null)}
        >
          {marcas.map((marca) => {
            const y = zeroY - (marca >= 0 ? escala(marca) : -escala(marca));
            return (
              <g key={marca}>
                <line
                  x1={MARGEM.left}
                  x2={w - MARGEM.right}
                  y1={y}
                  y2={y}
                  stroke={marca === 0 ? 'var(--axis)' : 'var(--grid)'}
                />
                <text
                  x={MARGEM.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--text-muted)"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatBRLEixo(marca)}
                </text>
              </g>
            );
          })}

          {dados.map((item, indice) => {
            const centro = MARGEM.left + banda * (indice + 0.5);
            const x = centro - larguraBarra / 2;
            const altura = escala(item.saldo);
            const positivo = item.saldo >= 0;
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
                    x,
                    positivo ? zeroY - altura : zeroY,
                    larguraBarra,
                    altura,
                    4,
                    positivo ? 'cima' : 'baixo',
                  )}
                  fill={positivo ? 'var(--entrada)' : 'var(--saida)'}
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
                  aria-label={`${formatCompetenciaCurta(item.mes)}: saldo ${formatBRL(item.saldo)}`}
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
            className="pointer-events-none absolute top-2 z-10 rounded-lg border bg-surface-1 px-3 py-2 text-sm shadow-sm"
            style={{
              left: Math.min(
                Math.max(MARGEM.left + banda * (ativo! + 0.5) - 70, 4),
                w - 150,
              ),
            }}
          >
            <div className="font-semibold text-ink">
              {formatCompetenciaCurta(ponto.mes)}
            </div>
            <div
              className="numeros-alinhados"
              style={{
                color:
                  ponto.saldo >= 0 ? 'var(--texto-positivo)' : 'var(--status-critical)',
              }}
            >
              {ponto.saldo >= 0 ? 'Sobrou ' : 'Faltou '}
              {formatBRL(Math.abs(ponto.saldo))}
            </div>
          </div>
        )}
      </div>

      <TabelaDados
        titulo="Saldo por mês"
        colunas={['Mês', 'Saldo']}
        linhas={dados.map((item) => [
          formatCompetenciaCurta(item.mes),
          formatBRL(item.saldo),
        ])}
      />
    </div>
  );
}
