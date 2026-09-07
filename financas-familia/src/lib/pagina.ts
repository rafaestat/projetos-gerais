import { carregarDataset } from './data';
import { SheetError } from './sheets';
import type { Dataset } from './types';

export type Carga =
  | { ok: true; dataset: Dataset }
  | { ok: false; mensagem: string; dica?: string };

/** Carrega a planilha sem derrubar a página quando o Google recusa a leitura. */
export async function carregarSeguro(): Promise<Carga> {
  try {
    return { ok: true, dataset: await carregarDataset() };
  } catch (erro) {
    if (erro instanceof SheetError) {
      return { ok: false, mensagem: erro.message, dica: erro.dica };
    }
    return {
      ok: false,
      mensagem: erro instanceof Error ? erro.message : 'Erro desconhecido.',
    };
  }
}
