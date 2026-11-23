import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleError, pickFields, requireFields, ValidationError } from '@/lib/api';

const AQUISICAO_FIELDS = {
  id_fornecedor: 'int',
  id_produto: 'int',
  quantidade: 'number',
  preco: 'number', // preço unitário
  desconto: 'number',
  entrada: 'date',
  observacoes: 'optionalString',
} as const;

export async function GET() {
  try {
    const aquisicoes = await prisma.aquisicao.findMany({
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
      },
      orderBy: {
        entrada: 'desc'
      }
    });

    // Adicionar valor_total calculado
    const aquisicoesComTotal = aquisicoes.map(aquisicao => ({
      ...aquisicao,
      valor_total: (aquisicao.preco * aquisicao.quantidade) - aquisicao.desconto
    }));

    return NextResponse.json(aquisicoesComTotal);
  } catch (error) {
    return handleError(error, 'Erro ao buscar aquisicoes');
  }
}

export async function POST(request: Request) {
  try {
    const data = pickFields(await request.json(), AQUISICAO_FIELDS);
    requireFields(data, ['id_fornecedor', 'id_produto', 'quantidade', 'preco']);

    const idFornecedor = data.id_fornecedor as number;
    const idProduto = data.id_produto as number;
    const quantidade = data.quantidade as number;
    if (quantidade <= 0) throw new ValidationError('A quantidade deve ser maior que zero');

    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Verificar se fornecedor e produto existem
      const fornecedor = await tx.fornecedor.findUnique({ where: { id: idFornecedor } });
      if (!fornecedor) {
        throw new ValidationError(`Fornecedor com ID ${idFornecedor} não encontrado`);
      }

      const produto = await tx.produto.findUnique({ where: { id: idProduto } });
      if (!produto) {
        throw new ValidationError(`Produto com ID ${idProduto} não encontrado`);
      }

      // 2. Criar a Aquisição já vinculada ao produto
      const aquisicao = await tx.aquisicao.create({
        data: {
          id_fornecedor: idFornecedor,
          id_produto: idProduto,
          quantidade,
          preco: data.preco as number,
          desconto: (data.desconto as number | undefined) ?? 0,
          entrada: (data.entrada as Date | undefined) ?? new Date(),
          observacoes: (data.observacoes as string | null | undefined) ?? '',
        },
      });

      // 3. Somar ao estoque do produto (ou criar um estoque novo)
      let estoque;
      if (produto.id_estoque) {
        estoque = await tx.estoque.update({
          where: { id: produto.id_estoque },
          data: { quantidade: { increment: quantidade } }
        });
      } else {
        estoque = await tx.estoque.create({
          data: {
            nome: produto.nome,
            categoria: produto.categoria,
            preco: produto.preco,
            quantidade,
          }
        });
        await tx.produto.update({
          where: { id: idProduto },
          data: { id_estoque: estoque.id }
        });
      }

      return { aquisicao, estoque };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    return handleError(error, 'Erro ao processar aquisição');
  }
}
