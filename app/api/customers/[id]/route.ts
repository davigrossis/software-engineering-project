import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, parseId, pickFields } from '@/lib/api';
import { CLIENTE_FIELDS } from '@/lib/fields';

const NOT_FOUND = 'Cliente não encontrado';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: parseId(id) },
    });

    if (!cliente) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(cliente);
  } catch (error) {
    return handleError(error, 'Erro ao buscar cliente', NOT_FOUND);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = pickFields(await request.json(), CLIENTE_FIELDS);
    const cliente = await prisma.cliente.update({
      where: { id: parseId(id) },
      data,
    });

    return NextResponse.json(cliente);
  } catch (error) {
    return handleError(error, 'Erro ao atualizar cliente', NOT_FOUND);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.cliente.delete({
      where: { id: parseId(id) },
    });

    return NextResponse.json(
      { message: 'Cliente excluído com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Erro ao deletar cliente', NOT_FOUND);
  }
}
