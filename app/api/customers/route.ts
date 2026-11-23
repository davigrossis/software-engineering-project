import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, pickFields, requireFields } from '@/lib/api';
import { CLIENTE_FIELDS } from '@/lib/fields';
import type { Prisma } from '@/app/generated/prisma';

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        instituicao: true,
        cnpj: true,
        telefone: true,
        responsavel: true,
      },
      orderBy: {
        id: 'desc'
      }
    });

    return NextResponse.json(clientes);
  } catch (error) {
    return handleError(error, 'Erro ao buscar clientes');
  }
}

export async function POST(request: Request) {
  try {
    const data = pickFields(await request.json(), CLIENTE_FIELDS);
    requireFields(data, ['instituicao', 'cnpj', 'telefone', 'responsavel']);
    // requireFields acima garante os campos obrigatórios em tempo de execução
    const cliente = await prisma.cliente.create({ data: data as unknown as Prisma.ClienteCreateInput });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return handleError(error, 'Erro ao criar cliente');
  }
}
