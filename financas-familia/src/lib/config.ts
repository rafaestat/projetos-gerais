export type SheetsMode = 'api' | 'public' | 'fixture';

/** ID da planilha "fonte da verdade" do orçamento da casa. */
export const SHEET_ID =
  process.env.SHEET_ID ?? '1M5g_V8PXcmfsyL4QLs625TfdBkGy4mrK10h0OOzRc-Y';

/**
 * Como ler a planilha:
 * - `api`      — conta de serviço Google (recomendado: funciona com a planilha privada)
 * - `public`   — export CSV do próprio Sheets (exige link "qualquer pessoa com o link pode ver")
 * - `fixture`  — dados de exemplo embutidos, para rodar sem nenhuma credencial
 */
export const SHEETS_MODE: SheetsMode = (() => {
  const explicit = process.env.SHEETS_MODE as SheetsMode | undefined;
  if (explicit === 'api' || explicit === 'public' || explicit === 'fixture') {
    return explicit;
  }
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return 'api';
  if (process.env.SHEET_ID) return 'public';
  return 'fixture';
})();

/**
 * Nome da aba, ou `gid:123456` (o número que aparece na URL ao clicar na aba).
 * O `gid` é o caminho mais confiável quando o nome da aba tem acento ou espaço.
 */
export const TAB_TRANSACOES = process.env.SHEET_TAB_TRANSACOES ?? 'Transacoes';
export const TAB_CATEGORIAS = process.env.SHEET_TAB_CATEGORIAS ?? 'Categorias';

/** Segundos de cache antes de reler a planilha. */
export const REVALIDATE_SECONDS = Number(process.env.REVALIDATE_SECONDS ?? 900);

/** Ordem de dia/mês quando a data vem como `05/06/2026`. */
export const DATE_ORDER: 'dmy' | 'mdy' =
  process.env.DATE_ORDER === 'mdy' ? 'mdy' : 'dmy';

/** Senha opcional para proteger o app (dados financeiros da família). */
export const APP_PASSWORD = process.env.APP_PASSWORD ?? '';

export const CACHE_TAG = 'planilha';
