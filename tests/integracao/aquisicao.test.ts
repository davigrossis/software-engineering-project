import { GET, POST } from '@/app/api/acquisitions/route';
import { prisma } from '@/lib/prisma';
import { requisicao } from './helpers';

const criarFornecedor = () => prisma.fornecedor.create({ data: { nome: 'Cooperado Teste' } });

const criarProduto = () =>
  prisma.produto.create({
    data: { nome: 'Alface', codigo_produto: 'ALF-1', categoria: 'Hortaliças', preco: 3 },
  });

describe('Aquisicao (integração)', () => {
  it('deve gravar a aquisição com o id_produto e somar a quantidade ao estoque existente', async () => {
    // Arrange
    const fornecedor = await criarFornecedor();
    const produto = await criarProduto();
    const estoque = await prisma.estoque.create({
      data: { nome: 'Alface', categoria: 'Hortaliças', preco: 3, quantidade: 5, produtos: { connect: { id: produto.id } } },
    });

    // Act
    const resposta = await POST(requisicao('POST', {
      id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10, preco: 3,
    }));

    // Assert
    expect(resposta.status).toBe(201);
    const aquisicoes = await prisma.aquisicao.findMany();
    expect(aquisicoes).toHaveLength(1);
    expect(aquisicoes[0]).toMatchObject({ id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10 });
    const estoqueNoBanco = await prisma.estoque.findUnique({ where: { id: estoque.id } });
    expect(estoqueNoBanco?.quantidade).toBe(15);
    expect(await prisma.estoque.count()).toBe(1);
  });

  it('deve criar o estoque e vincular ao produto quando ele ainda não tem estoque', async () => {
    // Arrange
    const fornecedor = await criarFornecedor();
    const produto = await criarProduto();

    // Act
    const resposta = await POST(requisicao('POST', {
      id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10, preco: 3,
    }));

    // Assert
    expect(resposta.status).toBe(201);
    const produtoNoBanco = await prisma.produto.findUnique({ where: { id: produto.id }, include: { estoque: true } });
    expect(produtoNoBanco?.estoque).toMatchObject({ nome: 'Alface', categoria: 'Hortaliças', preco: 3, quantidade: 10 });
    expect(await prisma.estoque.count()).toBe(1);
  });

  it('deve recusar fornecedor inexistente sem gravar a aquisição', async () => {
    // Arrange
    const produto = await criarProduto();

    // Act
    const resposta = await POST(requisicao('POST', {
      id_fornecedor: 999, id_produto: produto.id, quantidade: 10, preco: 3,
    }));

    // Assert
    expect(resposta.status).toBe(400);
    expect(await prisma.aquisicao.count()).toBe(0);
    expect(await prisma.estoque.count()).toBe(0);
  });

  it('deve recusar produto inexistente sem gravar a aquisição', async () => {
    // Arrange
    const fornecedor = await criarFornecedor();

    // Act
    const resposta = await POST(requisicao('POST', {
      id_fornecedor: fornecedor.id, id_produto: 999, quantidade: 10, preco: 3,
    }));

    // Assert
    expect(resposta.status).toBe(400);
    expect(await prisma.aquisicao.count()).toBe(0);
    expect(await prisma.estoque.count()).toBe(0);
  });

  it('deve listar as aquisições com o produto e o valor_total', async () => {
    // Arrange
    const fornecedor = await criarFornecedor();
    const produto = await criarProduto();
    await prisma.aquisicao.create({
      data: { id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10, preco: 3, desconto: 5 },
    });

    // Act
    const resposta = await GET();

    // Assert
    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo).toHaveLength(1);
    expect(corpo[0].produto).toMatchObject({ id: produto.id, nome: 'Alface' });
    expect(corpo[0].valor_total).toBe(25);
  });
});
