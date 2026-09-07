import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE_SESSAO, comparaSeguro, tokenDaSessao } from '@/lib/sessao';

export async function middleware(request: NextRequest) {
  const senha = process.env.APP_PASSWORD;
  // Sem APP_PASSWORD o app fica aberto — modo local/desenvolvimento.
  if (!senha) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE_SESSAO)?.value ?? '';
  if (comparaSeguro(cookie, await tokenDaSessao(senha))) return NextResponse.next();

  const destino = new URL('/entrar', request.url);
  destino.searchParams.set('de', request.nextUrl.pathname);
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ['/((?!entrar|api/entrar|_next/static|_next/image|favicon.ico).*)'],
};
