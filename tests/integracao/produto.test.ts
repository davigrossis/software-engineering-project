import { POST } from '@/app/api/products/route';
import { DELETE, PUT } from '@/app/api/products/[id]/route';
import { prisma } from '@/lib/prisma';
import { params, requisicao } from './helpers';

const alface = { nome: 'Alface', codigo_produto: 'ALF-1', categoria: 'Hortaliças', preco: 3 };

describe('Produto (integração)', () => {
  it('deve recusar código de produto duplicado com 409 sem gravar outro produto', async () => {
    // Arrange
    await prisma.produto.create({ data: alface });

    // Act
    const resposta = await POST(requisicao('POST', { ...alface, nome: 'Alface Crespa' }));

    // Assert
    expect(resposta.status).toBe(409);
    expect(await prisma.produto.count()).toBe(1);
  });

  it('deve sincronizar nome, categoria e preço no estoque vinculado', async () => {
    // Arrange
    const estoque = await prisma.estoque.create({
      data: { nome: alface.nome, categoria: alface.categoria, preco: alface.preco, quantidade: 50 },
    });
    const produto = await prisma.produto.create({ data: { ...alface, id_estoque: estoque.id } });

    // Act
    const resposta = await PUT(
      requisicao('PUT', { nome: 'Alface Americana', categoria: 'Folhosas', preco: 4.5 }),
      params(produto.id),
    );

    // Assert
    expect(resposta.status).toBe(200);
    const produtoNoBanco = await prisma.produto.findUnique({ where: { id: produto.id } });
    expect(produtoNoBanco).toMatchObject({ nome: 'Alface Americana', categoria: 'Folhosas', preco: 4.5 });
    const estoqueNoBanco = await prisma.estoque.findUnique({ where: { id: estoque.id } });
    expect(estoqueNoBanco).toMatchObject({
      nome: 'Alface Americana',
      categoria: 'Folhosas',
      preco: 4.5,
      quantidade: 50,
    });
  });

  it('deve recusar com 409 a exclusão de produto que está em pedido e mantê-lo no banco', async () => {
    // Arrange
    const produto = await prisma.produto.create({ data: alface });
    const cliente = await prisma.cliente.create({
      data: { instituicao: 'Escola 1', cnpj: '00.000.000/0001-01', telefone: '(32) 99999-0000', responsavel: 'Ana' },
    });
    await prisma.pedido.create({
      data: {
        codigo_pedido: 'PED-1',
        id_cliente: cliente.id,
        itens: { create: { id_produto: produto.id, quantidade: 2, preco_unitario: 3 } },
      },
    });

    // Act
    const resposta = await DELETE(requisicao('DELETE'), params(produto.id));

    // Assert
    expect(resposta.status).toBe(409);
    expect(await prisma.produto.findUnique({ where: { id: produto.id } })).not.toBeNull();
    expect(await prisma.itemPedido.count({ where: { id_produto: produto.id } })).toBe(1);
  });

  it('deve remover o produto sem pedido e deixar as aquisições com id_produto nulo', async () => {
    // Arrange
    const produto = await prisma.produto.create({ data: alface });
    const fornecedor = await prisma.fornecedor.create({ data: { nome: 'João da Horta' } });
    const aquisicao = await prisma.aquisicao.create({
      data: { id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10, preco: 3 },
    });

    // Act
    const resposta = await DELETE(requisicao('DELETE'), params(produto.id));

    // Assert
    expect(resposta.status).toBe(200);
    expect(await prisma.produto.findUnique({ where: { id: produto.id } })).toBeNull();
    const aquisicaoNoBanco = await prisma.aquisicao.findUnique({ where: { id: aquisicao.id } });
    expect(aquisicaoNoBanco).not.toBeNull();
    expect(aquisicaoNoBanco?.id_produto).toBeNull();
  });
});
