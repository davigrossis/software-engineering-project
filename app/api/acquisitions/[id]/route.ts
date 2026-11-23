import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, parseId, pickFields } from '@/lib/api';
import type { Prisma } from '@/app/generated/prisma';

const NOT_FOUND = 'Aquisição não encontrada';

const AQUISICAO_UPDATE_FIELDS = {
  id_fornecedor: 'int',
  id_produto: 'int',
  quantidade: 'number',
  preco: 'number', // preço unitário
  desconto: 'number',
  entrada: 'date',
  observacoes: 'optionalString',
} as const;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const aquisicao = await prisma.aquisicao.findUnique({
      where: { id: parseId(id) },
      include: {
        produto: {
          select: {
            id: true,
            nome: true,
            preco: true,
            unidade: true
          }
        },
        fornecedor: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    });

    if (!aquisicao) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(aquisicao);
  } catch (error) {
    return handleError(error, 'Erro ao buscar aquisição', NOT_FOUND);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = pickFields(await request.json(), AQUISICAO_UPDATE_FIELDS);

    const aquisicao = await prisma.aquisicao.update({
      where: { id: parseId(id) },
      data: data as Prisma.AquisicaoUncheckedUpdateInput,
    });

    return NextResponse.json(aquisicao);
  } catch (error) {
    return handleError(error, 'Erro ao atualizar aquisição', NOT_FOUND);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.aquisicao.delete({
      where: { id: parseId(id) },
    });

    return NextResponse.json(
      { message: 'Aquisição excluída com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, 'Erro ao deletar aquisição', NOT_FOUND);
  }
}
