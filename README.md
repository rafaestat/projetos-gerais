# Finanças da Casa

App para a família acompanhar o orçamento da casa no estilo GuiaBolso, lendo
direto da planilha do Google que já é a fonte da verdade.

O código do app está em **[`financas-familia/`](financas-familia/)** — comece
pelo README de lá para rodar e conectar a planilha.

| Onde | O quê |
|---|---|
| [`financas-familia/`](financas-familia/) | O app (Next.js + TypeScript), com README próprio |
| [`.planning/`](.planning/) | Contexto, roadmap e estado do projeto (formato GSD Core) |
| [`.planning/notas-planilha.md`](.planning/notas-planilha.md) | O que encontrei de estranho na planilha e como o app lida |
| `.claude/` | GSD Core 1.13.0 instalado no projeto (comandos `/gsd-*`) |

## Resumo rápido

```bash
cd financas-familia
npm install
npm run dev        # sobe em modo demonstração, sem precisar de credencial
```

Para ligar na planilha de verdade, copie `.env.example` para `.env.local` e
siga a seção *Conectando a planilha* do README do app.
