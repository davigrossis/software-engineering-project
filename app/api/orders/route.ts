import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, pickFields, requireFields } from '@/lib/api';
import { aplicarItens, parseItens } from '@/lib/pedidos';
import { PEDIDO_FIELDS } from '@/lib/fields';

export async function GET() {
  try {
    const pedidos = await prisma.pedido.findMany({
      select: {
        id: true,
        codigo_pedido: true,
        cliente: {
          select: {
            id: true,
            instituicao: true
          }
        },
        status: true,
        data: true,
        preco: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    return NextResponse.json(pedidos);
  } catch (error) {
    return handleError(error, 'Erro ao buscar pedidos');
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = pickFields(body, PEDIDO_FIELDS);
    requireFields(data, ['id_cliente']);
    const itens = body.itens !== undefined ? parseItens(body.itens) : [];
    const desconto = (data.desconto as number | undefined) ?? 0;

    const pedido = await prisma.$transaction(async (tx) => {
      const novo = await tx.pedido.create({
        data: {
          id_cliente: data.id_cliente as number,
          codigo_pedido: (data.codigo_pedido as string | undefined) || `PED-${Date.now()}`,
          status: (data.status as string | undefined) || 'Pendente',
          ...(data.data ? { data: data.data as Date } : {}),
          desconto,
          preco: (data.preco as number | undefined) ?? 0,
        },
      });

      if (itens.length === 0) return novo;

      // Com itens, o total é recalculado no servidor a partir dos preços cadastrados
      const subtotal = await aplicarItens(tx, novo.id, itens);
      return tx.pedido.update({
        where: { id: novo.id },
        data: { preco: subtotal - desconto },
        include: { itens: true },
      });
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    return handleError(error, 'Erro ao criar pedido');
  }
}
