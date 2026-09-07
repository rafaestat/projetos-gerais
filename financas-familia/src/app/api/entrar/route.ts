import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE_SESSAO, comparaSeguro, tokenDaSessao } from '@/lib/sessao';

export async function POST(request: NextRequest) {
  const senhaConfigurada = process.env.APP_PASSWORD ?? '';
  const form = await request.formData();
  const enviada = String(form.get('senha') ?? '');
  const destino = String(form.get('de') || '/');

  if (!senhaConfigurada) {
    return NextResponse.redirect(new URL('/', request.url), { status: 303 });
  }

  const token = await tokenDaSessao(senhaConfigurada);
  if (!comparaSeguro(await tokenDaSessao(enviada), token)) {
    const erro = new URL('/entrar', request.url);
    erro.searchParams.set('erro', '1');
    erro.searchParams.set('de', destino);
    return NextResponse.redirect(erro, { status: 303 });
  }

  const resposta = NextResponse.redirect(
    new URL(destino.startsWith('/') ? destino : '/', request.url),
    { status: 303 },
  );
  resposta.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return resposta;
}
