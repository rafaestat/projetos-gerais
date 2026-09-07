/**
 * Minimal RFC 4180 CSV parser.
 *
 * The Google Sheets CSV export quotes any field containing `,`, `"` or a line
 * break, so a hand-rolled parser is enough and keeps the app dependency-free.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  // Strip a UTF-8 BOM — Sheets emits one on CSV exports.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      // Swallow the \n of a \r\n pair.
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Normalizes a header cell so `ID_Hash`, `id hash` and `Id-Hash` all match. */
export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toLowerCase();
}

/**
 * Turns a raw grid into objects keyed by normalized header name.
 *
 * The sheet tabs do not always start on row 1 (some carry a blank spacer row
 * above the header), so the header row is located by looking for the first row
 * that contains every required column.
 */
export function rowsToRecords(
  grid: string[][],
  required: string[],
): Record<string, string>[] {
  const wanted = required.map(normalizeHeader);
  const headerIndex = grid.findIndex((row) => {
    const cells = row.map(normalizeHeader);
    return wanted.every((column) => cells.includes(column));
  });
  if (headerIndex === -1) return [];

  const header = grid[headerIndex].map(normalizeHeader);
  const records: Record<string, string>[] = [];

  for (let i = headerIndex + 1; i < grid.length; i++) {
    const row = grid[i];
    if (row.every((cell) => cell.trim() === '')) continue;
    const record: Record<string, string> = {};
    header.forEach((column, index) => {
      if (column) record[column] = (row[index] ?? '').trim();
    });
    records.push(record);
  }

  return records;
}
