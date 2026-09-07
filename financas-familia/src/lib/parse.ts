/**
 * Parsers for the raw cell values that come out of the planilha.
 *
 * The sheet mixes conventions — values appear as `-R$ 15.19` (dot decimal) in
 * the Transacoes tab and as `-R$399,08` (pt-BR) in the summary tabs, dates
 * appear as ISO and as dd/mm/yyyy — so every parser below accepts both.
 */

/** Removes the backslash escapes the Sheets markdown/CSV export sometimes adds. */
function clean(value: string): string {
  return value.replace(/\\/g, '').replace(/\u00a0/g, ' ').trim();
}

/**
 * Parses a monetary cell into a number. Negative means "saída de dinheiro".
 * Returns `null` when the cell is empty or is not a number at all.
 */
export function parseValor(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const value = clean(String(raw));
  if (!value) return null;

  const negative = /^[-−]/.test(value) || /^\(.*\)$/.test(value);
  let digits = value.replace(/[^0-9.,]/g, '');
  if (!digits || !/[0-9]/.test(digits)) return null;

  const lastComma = digits.lastIndexOf(',');
  const lastDot = digits.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Both separators present: the rightmost one is the decimal separator.
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    digits = digits.split(thousandSep).join('');
    digits = digits.replace(decimalSep, '.');
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? ',' : '.';
    const occurrences = digits.split(sep).length - 1;
    const decimals = digits.length - digits.lastIndexOf(sep) - 1;
    if (occurrences > 1 || decimals === 3) {
      // 1.234.567 or 1.234 — grouping, not a decimal separator.
      digits = digits.split(sep).join('');
    } else {
      digits = digits.replace(sep, '.');
    }
  }

  const parsed = Number.parseFloat(digits);
  if (!Number.isFinite(parsed)) return null;
  const magnitude = Math.abs(parsed);
  return negative ? -magnitude : parsed;
}

const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})/;
const SLASH_DATE = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Parses a date cell into `YYYY-MM-DD`.
 *
 * `order` disambiguates dd/mm/yyyy from mm/dd/yyyy when both readings are
 * possible; a day above 12 settles it regardless of the configured order.
 */
export function parseData(
  raw: string | undefined | null,
  order: 'dmy' | 'mdy' = 'dmy',
): string | null {
  if (raw == null) return null;
  const value = clean(String(raw));
  if (!value) return null;

  const iso = ISO_DATE.exec(value);
  if (iso) {
    return `${iso[1]}-${pad(Number(iso[2]))}-${pad(Number(iso[3]))}`;
  }

  const slash = SLASH_DATE.exec(value);
  if (slash) {
    const first = Number(slash[1]);
    const second = Number(slash[2]);
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    let day: number;
    let month: number;
    if (first > 12) {
      day = first;
      month = second;
    } else if (second > 12) {
      month = first;
      day = second;
    } else if (order === 'mdy') {
      month = first;
      day = second;
    } else {
      day = first;
      month = second;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${year}-${pad(month)}-${pad(day)}`;
  }

  // gviz sometimes emits `Date(2026,7,30)` (month is zero-based).
  const gviz = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})/.exec(value);
  if (gviz) {
    return `${gviz[1]}-${pad(Number(gviz[2]) + 1)}-${pad(Number(gviz[3]))}`;
  }

  return null;
}

/**
 * Normalizes a competência cell to `YYYY-MM`.
 * The sheet stores both `2026-04-01` and `2026-04`.
 */
export function parseCompetencia(
  raw: string | undefined | null,
  fallbackData?: string | null,
): string | null {
  const value = raw == null ? '' : clean(String(raw));

  const isoMonth = /^(\d{4})-(\d{1,2})/.exec(value);
  if (isoMonth) return `${isoMonth[1]}-${pad(Number(isoMonth[2]))}`;

  const brMonth = /^(\d{1,2})[/.](\d{4})$/.exec(value);
  if (brMonth) return `${brMonth[2]}-${pad(Number(brMonth[1]))}`;

  const asDate = parseData(value);
  if (asDate) return asDate.slice(0, 7);

  if (fallbackData) {
    const parsed = parseData(fallbackData);
    if (parsed) return parsed.slice(0, 7);
  }

  return null;
}

export interface Parcela {
  atual: number;
  total: number;
}

/** Parses `8/10` or `08/08` into `{ atual: 8, total: 10 }`. */
export function parseParcela(raw: string | undefined | null): Parcela | null {
  if (raw == null) return null;
  const match = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(clean(String(raw)));
  if (!match) return null;
  const atual = Number(match[1]);
  const total = Number(match[2]);
  if (!total || atual > total) return null;
  return { atual, total };
}

/** `2026-04` → `2026-03`. */
export function previousMonth(competencia: string): string {
  const [year, month] = competencia.split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
}

/** `2026-04` → `2026-05`. */
export function nextMonth(competencia: string): string {
  const [year, month] = competencia.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${pad(month + 1)}`;
}
