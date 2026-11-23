import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, parseId, pickFields } from '@/lib/api';
import { FORNECEDOR_FIELDS } from '@/lib/fields';

const NOT_FOUND = 'Fornecedor não encontrado';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id: parseId(id) },
    });

    if (!fornecedor) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(fornecedor);
  } catch (error) {
    return handleError(error, 'Erro ao buscar fornecedor', NOT_FOUND);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = pickFields(await request.json(), FORNECEDOR_FIELDS);
    const fornecedor = await prisma.fornecedor.update({
      where: { id: parseId(id) },
      data,
    });

    return NextResponse.json(fornecedor);
  } catch (error) {
    return handleError(error, 'Erro ao atualizar fornecedor', NOT_FOUND);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.fornecedor.delete({
      where: { id: parseId(id) },
    });

    return NextResponse.json(
      { message: 'Fornecedor excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Erro ao deletar fornecedor', NOT_FOUND);
  }
}
