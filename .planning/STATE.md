---
gsd_state_version: '1.0'
status: executing
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 2
  completed_plans: 2
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-07)

**Core value:** A planilha do Google continua sendo a fonte da verdade — o app só lê.
**Current focus:** Fase 3 — uso real com a planilha conectada

## Current Position

Phase: 2 of 4 (As cinco telas) — concluída
Status: Ready to plan (Fase 3)
Last activity: 2026-09-07 — MVP construído, testado e verificado no navegador

Progress: [█████░░░░░] 50%

## O que já está de pé

- `financas-familia/` — app Next.js 15 + TypeScript, sem dependência de runtime
  além do próprio Next/React.
- 24 testes (vitest) cobrindo parsers de valor/data/competência/parcela, leitura
  de CSV e as agregações.
- `npm run verificar` = typecheck + lint + testes + build, todos passando.
- Telas conferidas no Chromium em 390px e 1120px, claro e escuro, sem erro de
  console e sem divergência de hidratação.

## Decisões em aberto

1. **Nome das abas da planilha.** O app usa `Transacoes` e `Categorias` por
   padrão; os nomes reais precisam ser confirmados e colocados em
   `SHEET_TAB_TRANSACOES` / `SHEET_TAB_CATEGORIAS` (ou o `gid:` da aba).
2. **Como publicar.** Rodar local no Wi-Fi de casa ou publicar na Vercel com
   `APP_PASSWORD`. Enquanto não decidir, roda local.
3. **Correções na própria planilha.** A leitura é defensiva, mas alguns pontos
   valem arrumar na fonte — estão listados em `.planning/notas-planilha.md`.

## Próximo passo

Criar a conta de serviço do Google, compartilhar a planilha com o e-mail dela e
rodar `SHEETS_MODE=api` contra os dados reais.
