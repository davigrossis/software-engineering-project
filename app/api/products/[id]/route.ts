import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, parseId, pickFields } from '@/lib/api';
import { PRODUTO_FIELDS } from '@/lib/fields';

const NOT_FOUND = 'Produto não encontrado';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const produto = await prisma.produto.findUnique({
      where: { id: parseId(id) },
    });

    if (!produto) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(produto);
  } catch (error) {
    return handleError(error, 'Erro ao buscar produto', NOT_FOUND);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = pickFields(await request.json(), PRODUTO_FIELDS);

    const produto = await prisma.$transaction(async (tx) => {
      const atualizado = await tx.produto.update({
        where: { id: parseId(id) },
        data,
      });

      // Mantém em sincronia os dados do produto que são copiados para o Estoque
      if (atualizado.id_estoque) {
        await tx.estoque.update({
          where: { id: atualizado.id_estoque },
          data: {
            nome: atualizado.nome,
            categoria: atualizado.categoria,
            preco: atualizado.preco,
          },
        });
      }

      return atualizado;
    });

    return NextResponse.json(produto);
  } catch (error) {
    return handleError(error, 'Erro ao atualizar produto', NOT_FOUND);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.produto.delete({
      where: { id: parseId(id) },
    });

    return NextResponse.json(
      { message: 'Produto excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Erro ao deletar produto', NOT_FOUND);
  }
}
