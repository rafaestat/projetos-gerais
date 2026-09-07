/**
 * Proteção simples por senha compartilhada: são dados financeiros da família,
 * então o app nunca deve ficar aberto na internet sem nada na frente.
 *
 * Usa Web Crypto para funcionar tanto no middleware (edge) quanto no servidor.
 */
export const COOKIE_SESSAO = 'financas_sessao';

export async function tokenDaSessao(senha: string): Promise<string> {
  const dados = new TextEncoder().encode(`financas-familia:${senha}`);
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Comparação em tempo constante, para não vazar a senha por temporização. */
export function comparaSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferenca = 0;
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}
