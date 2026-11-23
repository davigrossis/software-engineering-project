import type { Prisma } from '../app/generated/prisma';
import { ValidationError } from './api';

type Tx = Prisma.TransactionClient;

export interface ItemInput {
  id_produto: number;
  quantidade: number;
}

/** Valida o array `itens` vindo do cliente e agrupa itens repetidos do mesmo produto. */
export function parseItens(raw: unknown): ItemInput[] {
  if (!Array.isArray(raw)) throw new ValidationError('Campo "itens" deve ser uma lista');

  const agrupados = new Map<number, number>();
  for (const item of raw) {
    const id = Number((item as Record<string, unknown>)?.id_produto);
    const quantidade = Number((item as Record<string, unknown>)?.quantidade);
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Item com produto inválido');
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      throw new ValidationError('A quantidade de cada item deve ser maior que zero');
    }
    agrupados.set(id, (agrupados.get(id) ?? 0) + quantidade);
  }
  return [...agrupados].map(([id_produto, quantidade]) => ({ id_produto, quantidade }));
}

/**
 * Grava os itens do pedido e dá baixa no estoque de cada produto.
 * O preço unitário vem do cadastro do produto (não do cliente).
 * Retorna o subtotal (soma de quantidade × preço) para o cálculo do total do pedido.
 */
export async function aplicarItens(tx: Tx, idPedido: number, itens: ItemInput[]): Promise<number> {
  let subtotal = 0;

  for (const item of itens) {
    const produto = await tx.produto.findUnique({ where: { id: item.id_produto } });
    if (!produto) throw new ValidationError(`Produto com ID ${item.id_produto} não encontrado`);
    if (!produto.id_estoque) {
      throw new ValidationError(`O produto "${produto.nome}" não possui estoque cadastrado`);
    }

    // updateMany com condição garante a baixa atômica sem deixar o estoque negativo
    const baixa = await tx.estoque.updateMany({
      where: { id: produto.id_estoque, quantidade: { gte: item.quantidade } },
      data: { quantidade: { decrement: item.quantidade } },
    });
    if (baixa.count === 0) {
      throw new ValidationError(`Estoque insuficiente para o produto "${produto.nome}"`);
    }

    await tx.itemPedido.create({
      data: {
        id_pedido: idPedido,
        id_produto: produto.id,
        quantidade: item.quantidade,
        preco_unitario: produto.preco,
      },
    });
    subtotal += produto.preco * item.quantidade;
  }

  return subtotal;
}

/** Devolve ao estoque as quantidades dos itens do pedido e remove esses itens. */
export async function devolverItens(tx: Tx, idPedido: number) {
  const itens = await tx.itemPedido.findMany({
    where: { id_pedido: idPedido },
    include: { produto: { select: { id_estoque: true } } },
  });

  for (const item of itens) {
    if (item.produto.id_estoque) {
      await tx.estoque.update({
        where: { id: item.produto.id_estoque },
        data: { quantidade: { increment: item.quantidade } },
      });
    }
  }

  await tx.itemPedido.deleteMany({ where: { id_pedido: idPedido } });
}
