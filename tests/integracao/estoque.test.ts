import { POST } from '@/app/api/stock/route';
import { PUT } from '@/app/api/stock/[id]/route';
import { prisma } from '@/lib/prisma';
import { params, requisicao } from './helpers';

const criarProduto = () =>
  prisma.produto.create({
    data: { nome: 'Alface', codigo_produto: 'ALF-1', categoria: 'Hortaliças', preco: 3 },
  });

describe('Estoque (integração)', () => {
  it('deve criar o estoque com os dados do produto e gravar o id_estoque no produto', async () => {
    // Arrange
    const produto = await criarProduto();

    // Act
    const resposta = await POST(requisicao('POST', { id_produto: produto.id, quantidade: 20 }));

    // Assert
    expect(resposta.status).toBe(201);
    const corpo = await resposta.json();
    const estoque = await prisma.estoque.findUnique({ where: { id: corpo.id } });
    expect(estoque).toMatchObject({ nome: 'Alface', categoria: 'Hortaliças', preco: 3, quantidade: 20 });
    const produtoNoBanco = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(produtoNoBanco?.id_estoque).toBe(corpo.id);
    expect(await prisma.estoque.count()).toBe(1);
  });

  it('deve recusar um segundo estoque para o mesmo produto sem criar nada', async () => {
    // Arrange
    const produto = await criarProduto();
    const estoque = await prisma.estoque.create({
      data: { nome: 'Alface', categoria: 'Hortaliças', preco: 3, quantidade: 5, produtos: { connect: { id: produto.id } } },
    });

    // Act
    const resposta = await POST(requisicao('POST', { id_produto: produto.id, quantidade: 20 }));

    // Assert
    expect(resposta.status).toBe(400);
    expect(await prisma.estoque.count()).toBe(1);
    const estoqueNoBanco = await prisma.estoque.findUnique({ where: { id: estoque.id } });
    expect(estoqueNoBanco?.quantidade).toBe(5);
    const produtoNoBanco = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(produtoNoBanco?.id_estoque).toBe(estoque.id);
  });

  it('deve recusar quantidade negativa no PUT sem alterar o estoque', async () => {
    // Arrange
    const estoque = await prisma.estoque.create({
      data: { nome: 'Alface', categoria: 'Hortaliças', preco: 3, quantidade: 8 },
    });

    // Act
    const resposta = await PUT(requisicao('PUT', { quantidade: -1 }), params(estoque.id));

    // Assert
    expect(resposta.status).toBe(400);
    const estoqueNoBanco = await prisma.estoque.findUnique({ where: { id: estoque.id } });
    expect(estoqueNoBanco?.quantidade).toBe(8);
  });
});
