/*
 * Ateliê Essenzia — Porteiro da afordância visual
 *
 * Verificação estrutural, sem dependências: confere que cada estação de
 * `atelie/js/stations.js` fala o vocabulário compartilhado do módulo
 * Affordance (convite, encaixe, contato, cursor) em vez de depender só de
 * texto ou da mãozinha-guia legada. Roda via terminal (`node
 * tools/check-affordance.cjs [ids...]`); não é carregado por nenhuma página.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const STATIONS_PATH = path.join(__dirname, "..", "atelie", "js", "stations.js");
const DEFAULT_IDS = ["velas", "sabonete", "papel", "madeira", "selo", "micangas", "embalagem"];
const REQUIRED_MARKS = [
  "Affordance.render(ctx, this.cue(), t)",
  "cue() {",
  "this.cursorName",
  "this.contact",
  'kind: "invitation"',
];

function extractBlock(source, id) {
  const startMarker = `Engine.register("${id}"`;
  const start = source.indexOf(startMarker);
  if (start === -1) return null;
  const nextRegister = source.indexOf("Engine.register(", start + startMarker.length);
  return source.slice(start, nextRegister === -1 ? source.length : nextRegister);
}

function main() {
  const ids = process.argv.slice(2);
  const targets = ids.length > 0 ? ids : DEFAULT_IDS;
  const source = fs.readFileSync(STATIONS_PATH, "utf8");

  let failed = false;
  const failures = [];

  for (const id of targets) {
    const block = extractBlock(source, id);
    if (block === null) {
      failed = true;
      failures.push(`${id}: estação não encontrada em stations.js`);
      continue;
    }
    const missing = REQUIRED_MARKS.filter((mark) => !block.includes(mark));
    if (missing.length > 0) {
      failed = true;
      failures.push(`${id}: faltando ${missing.join(", ")}`);
    } else {
      console.log(`${id} ok`);
    }
  }

  if (failed) {
    for (const line of failures) console.error(line);
    process.exit(1);
  }
}

main();
