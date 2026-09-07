import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parseCsv } from './csv';
import {
  CACHE_TAG,
  REVALIDATE_SECONDS,
  SHEET_ID,
  SHEETS_MODE,
  type SheetsMode,
} from './config';

export class SheetError extends Error {
  constructor(
    message: string,
    readonly dica?: string,
  ) {
    super(message);
    this.name = 'SheetError';
  }
}

const nextOptions: RequestInit = {
  next: { revalidate: REVALIDATE_SECONDS, tags: [CACHE_TAG] },
};

/* -------------------------------------------------------------------------- */
/* Modo `public` — export CSV do Google Sheets                                 */
/* -------------------------------------------------------------------------- */

function publicUrl(tab: string): string {
  const gid = /^gid:(\d+)$/.exec(tab.trim());
  if (gid) {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid[1]}`;
  }
  const query = new URLSearchParams({ tqx: 'out:csv', sheet: tab });
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${query}`;
}

async function fetchPublic(tab: string): Promise<string[][]> {
  const response = await fetch(publicUrl(tab), {
    ...nextOptions,
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new SheetError(
      `O Google recusou a leitura da aba "${tab}" (HTTP ${response.status}).`,
      'Confira se a planilha está compartilhada como "qualquer pessoa com o link pode ver" e se o nome da aba em SHEET_TAB_* está correto. Para planilha privada, use SHEETS_MODE=api.',
    );
  }
  const body = await response.text();
  if (body.trimStart().startsWith('<')) {
    throw new SheetError(
      `A aba "${tab}" respondeu com uma página de login em vez de CSV.`,
      'A planilha está privada: use SHEETS_MODE=api com uma conta de serviço, ou libere o link para leitura.',
    );
  }
  return parseCsv(body);
}

/* -------------------------------------------------------------------------- */
/* Modo `api` — conta de serviço + Google Sheets API v4                        */
/* -------------------------------------------------------------------------- */

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new SheetError(
      'SHEETS_MODE=api exige a variável GOOGLE_SERVICE_ACCOUNT_JSON.',
      'Cole o JSON da conta de serviço (ou seu conteúdo em base64) em .env.local.',
    );
  }
  const json = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8');
  const parsed = JSON.parse(json) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    throw new SheetError('JSON da conta de serviço sem client_email/private_key.');
  }
  return { ...parsed, private_key: parsed.private_key.replace(/\\n/g, '\n') };
}

async function getAccessToken(): Promise<string> {
  const account = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = base64url(
    createSign('RSA-SHA256').update(`${header}.${claims}`).sign(account.private_key),
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
    // O token vale 1h; guardamos por 50 min.
    next: { revalidate: 3000 },
  });

  if (!response.ok) {
    throw new SheetError(
      `Falha ao autenticar a conta de serviço (HTTP ${response.status}).`,
      'Verifique se a API do Google Sheets está ativada no projeto e se a planilha foi compartilhada com o e-mail da conta de serviço.',
    );
  }

  const token = (await response.json()) as { access_token?: string };
  if (!token.access_token) throw new SheetError('Resposta de token sem access_token.');
  return token.access_token;
}

async function fetchApi(tab: string): Promise<string[][]> {
  const token = await getAccessToken();
  const gid = /^gid:(\d+)$/.exec(tab.trim());
  let range = tab;

  if (gid) {
    // A API v4 endereça por nome; traduzimos o gid consultando os metadados.
    const meta = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`,
      { ...nextOptions, headers: { Authorization: `Bearer ${token}` } },
    );
    if (!meta.ok) {
      throw new SheetError(`Não consegui ler os metadados da planilha (HTTP ${meta.status}).`);
    }
    const body = (await meta.json()) as {
      sheets?: { properties?: { sheetId?: number; title?: string } }[];
    };
    const found = body.sheets?.find(
      (sheet) => String(sheet.properties?.sheetId) === gid[1],
    );
    if (!found?.properties?.title) {
      throw new SheetError(`Nenhuma aba com gid ${gid[1]} nesta planilha.`);
    }
    range = found.properties.title;
  }

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/` +
    `${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`;
  const response = await fetch(url, {
    ...nextOptions,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new SheetError(
      `Não consegui ler a aba "${range}" pela API (HTTP ${response.status}).`,
      'Compartilhe a planilha com o e-mail da conta de serviço (permissão de leitura) e confira o nome da aba.',
    );
  }

  const body = (await response.json()) as { values?: string[][] };
  return body.values ?? [];
}

/* -------------------------------------------------------------------------- */
/* Modo `fixture` — dados de exemplo, sem credencial nenhuma                   */
/* -------------------------------------------------------------------------- */

async function fetchFixture(tab: string): Promise<string[][]> {
  const arquivo = tab.toLowerCase().includes('categor')
    ? 'categorias.csv'
    : 'transacoes.csv';
  const caminho = path.join(process.cwd(), 'src', 'fixtures', arquivo);
  return parseCsv(await readFile(caminho, 'utf8'));
}

/* -------------------------------------------------------------------------- */

export async function fetchTab(tab: string, mode: SheetsMode = SHEETS_MODE) {
  if (mode === 'fixture') return fetchFixture(tab);
  if (mode === 'api') return fetchApi(tab);
  return fetchPublic(tab);
}
