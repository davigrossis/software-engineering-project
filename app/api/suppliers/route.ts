import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, pickFields, requireFields } from '@/lib/api';
import { FORNECEDOR_FIELDS } from '@/lib/fields';
import type { Prisma } from '@/app/generated/prisma';

export async function GET() {
  try {
    const fornecedores = await prisma.fornecedor.findMany({
        select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            area_atuacao: true,
            status: true,
        },
        orderBy: {
        id: 'desc'
      }
    });

    return NextResponse.json(fornecedores);
  } catch (error) {
    return handleError(error, 'Erro ao buscar fornecedores');
  }
}

export async function POST(request: Request) {
  try {
    const data = pickFields(await request.json(), FORNECEDOR_FIELDS);
    requireFields(data, ['nome']);
    // requireFields acima garante os campos obrigatórios em tempo de execução
    const fornecedor = await prisma.fornecedor.create({ data: data as unknown as Prisma.FornecedorCreateInput });
    return NextResponse.json(fornecedor, { status: 201 });
  } catch (error) {
    return handleError(error, 'Erro ao criar fornecedor');
  }
}
