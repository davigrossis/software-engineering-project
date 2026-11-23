import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, parseId, pickFields } from '@/lib/api';
import { aplicarItens, devolverItens, parseItens } from '@/lib/pedidos';
import { PEDIDO_FIELDS } from '@/lib/fields';
import type { Prisma } from '@/app/generated/prisma';

const NOT_FOUND = 'Pedido não encontrado';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedido = await prisma.pedido.findUnique({
      where: { id: parseId(id) },
      include: { itens: true },
    });

    if (!pedido) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(pedido);
  } catch (error) {
    return handleError(error, 'Erro ao buscar pedido', NOT_FOUND);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedidoId = parseId(id);
    const body = await request.json();
    const data = pickFields(body, PEDIDO_FIELDS) as Prisma.PedidoUncheckedUpdateInput;
    const itens = body.itens !== undefined ? parseItens(body.itens) : null;

    const pedido = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.pedido.update({ where: { id: pedidoId }, data });

      if (itens === null) return atualizado;

      // Substitui os itens: devolve o estoque dos antigos e dá baixa nos novos
      await devolverItens(tx, pedidoId);
      const subtotal = await aplicarItens(tx, pedidoId, itens);
      return tx.pedido.update({
        where: { id: pedidoId },
        data: { preco: subtotal - atualizado.desconto },
        include: { itens: true },
      });
    });

    return NextResponse.json(pedido);
  } catch (error) {
    return handleError(error, 'Erro ao atualizar pedido', NOT_FOUND);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pedidoId = parseId(id);

    await prisma.$transaction(async (tx) => {
      await devolverItens(tx, pedidoId);
      await tx.pedido.delete({ where: { id: pedidoId } });
    });

    return NextResponse.json(
      { message: 'Pedido excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Erro ao deletar pedido', NOT_FOUND);
  }
}
