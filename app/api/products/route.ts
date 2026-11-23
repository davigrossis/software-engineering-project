import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, pickFields, requireFields } from '@/lib/api';
import { PRODUTO_FIELDS } from '@/lib/fields';
import type { Prisma } from '@/app/generated/prisma';

export async function GET() {
  try {
    const produtos = await prisma.produto.findMany({
      select: {
        id: true,
        nome: true,
        codigo_produto: true,
        categoria: true,
        preco: true,
        unidade: true,
      },
      orderBy: {
        id: 'desc'
      }
    });

    return NextResponse.json(produtos);
  } catch (error) {
    return handleError(error, 'Erro ao buscar produtos');
  }
}

export async function POST(request: Request) {
  try {
    const data = pickFields(await request.json(), PRODUTO_FIELDS);
    requireFields(data, ['nome', 'codigo_produto', 'categoria', 'preco']);
    // requireFields acima garante os campos obrigatórios em tempo de execução
    const produto = await prisma.produto.create({ data: data as unknown as Prisma.ProdutoCreateInput });
    return NextResponse.json(produto, { status: 201 });
  } catch (error) {
    return handleError(error, 'Erro ao criar produto');
  }
}
