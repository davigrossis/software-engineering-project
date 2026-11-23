import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, parseId, pickFields, requireFields, ValidationError } from '@/lib/api';

const NOT_FOUND = 'Estoque não encontrado';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const estoque = await prisma.estoque.findUnique({
      where: { id: parseId(id) },
      include: { produtos: true },
    });

    if (!estoque) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(estoque);
  } catch (error) {
    return handleError(error, 'Erro ao buscar estoque', NOT_FOUND);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = pickFields(await request.json(), { quantidade: 'number' });
    requireFields(data, ['quantidade']);
    if ((data.quantidade as number) < 0) {
      throw new ValidationError('A quantidade não pode ser negativa');
    }

    const estoque = await prisma.estoque.update({
      where: { id: parseId(id) },
      data: { quantidade: data.quantidade as number },
    });

    return NextResponse.json(estoque);
  } catch (error) {
    return handleError(error, 'Erro ao atualizar estoque', NOT_FOUND);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.estoque.delete({
      where: { id: parseId(id) },
    });

    return NextResponse.json(
      { message: 'Estoque excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Erro ao deletar estoque', NOT_FOUND);
  }
}
