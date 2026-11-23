import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, pickFields, requireFields, ValidationError } from '@/lib/api';

export async function GET() {
  try {
    const estoques = await prisma.estoque.findMany({
      select: {
        id: true,
        nome: true,
        categoria: true,
        preco: true,
        quantidade: true,
      },
      orderBy: {
        id: 'desc'
      }
    });

    return NextResponse.json(estoques);
  } catch (error) {
    return handleError(error, 'Erro ao buscar estoques');
  }
}

export async function POST(request: Request) {
  try {
    const data = pickFields(await request.json(), { id_produto: 'int', quantidade: 'number' });
    requireFields(data, ['id_produto', 'quantidade']);
    const idProduto = data.id_produto as number;
    const quantidade = data.quantidade as number;
    if (quantidade < 0) throw new ValidationError('A quantidade não pode ser negativa');

    const estoque = await prisma.$transaction(async (tx) => {
      const produto = await tx.produto.findUnique({ where: { id: idProduto } });
      if (!produto) throw new ValidationError(`Produto com ID ${idProduto} não encontrado`);
      if (produto.id_estoque) {
        throw new ValidationError(`O produto "${produto.nome}" já possui estoque cadastrado`);
      }

      // Copia os dados do produto para o estoque e faz o vínculo
      return tx.estoque.create({
        data: {
          nome: produto.nome,
          categoria: produto.categoria,
          preco: produto.preco,
          quantidade,
          produtos: { connect: { id: produto.id } },
        },
      });
    });

    return NextResponse.json(estoque, { status: 201 });
  } catch (error) {
    return handleError(error, 'Erro ao criar estoque');
  }
}
