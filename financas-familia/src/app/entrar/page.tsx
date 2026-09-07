import type { SearchParams } from '@/lib/params';

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const erro = params.erro === '1';
  const de = typeof params.de === 'string' ? params.de : '/';

  return (
    <section className="cartao mx-auto w-full max-w-sm p-6">
      <h1 className="text-base font-semibold text-ink">Finanças da Casa</h1>
      <p className="pt-1 text-sm text-ink-3">
        Digite a senha combinada em casa para ver o orçamento.
      </p>
      <form method="post" action="/api/entrar" className="flex flex-col gap-3 pt-5">
        <input type="hidden" name="de" value={de} />
        <label className="text-sm text-ink-2" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-11 rounded-lg border bg-surface-1 px-3 text-ink"
        />
        {erro && (
          <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
            <span aria-hidden>✕ </span>Senha incorreta.
          </p>
        )}
        <button
          type="submit"
          className="min-h-11 rounded-lg font-semibold"
          style={{ background: 'var(--entrada)', color: '#ffffff' }}
        >
          Entrar
        </button>
      </form>
    </section>
  );
}
