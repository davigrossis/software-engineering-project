import { POST } from '@/app/api/orders/route';
import { DELETE, PUT } from '@/app/api/orders/[id]/route';
import { prisma } from '@/lib/prisma';
import { params, requisicao } from './helpers';

const criarCliente = () =>
  prisma.cliente.create({
    data: { instituicao: 'Escola Teste', cnpj: '00.000.000/0001-00', telefone: '3299999999', responsavel: 'Maria' },
  });

/** Cria um produto já vinculado a um estoque com a quantidade informada. */
const criarProdutoComEstoque = async (codigo: string, preco: number, quantidade: number) => {
  const estoque = await prisma.estoque.create({ data: { nome: codigo, categoria: 'Hortaliças', preco, quantidade } });
  const produto = await prisma.produto.create({
    data: { nome: codigo, codigo_produto: codigo, categoria: 'Hortaliças', preco, id_estoque: estoque.id },
  });
  return { produto, estoque };
};

describe('Pedido (integração)', () => {
  it('deve gravar os itens com o preço do cadastro e dar baixa no estoque', async () => {
    // Arrange
    const cliente = await criarCliente();
    const { produto, estoque } = await criarProdutoComEstoque('ALF-1', 4, 10);

    // Act
    const resposta = await POST(requisicao('POST', {
      id_cliente: cliente.id, itens: [{ id_produto: produto.id, quantidade: 3 }],
    }));

    // Assert
    expect(resposta.status).toBe(201);
    const corpo = await resposta.json();
    const itens = await prisma.itemPedido.findMany({ where: { id_pedido: corpo.id } });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ id_produto: produto.id, quantidade: 3, preco_unitario: 4 });
    const pedidoNoBanco = await prisma.pedido.findUnique({ where: { id: corpo.id } });
    expect(pedidoNoBanco?.preco).toBe(12);
    const estoqueNoBanco = await prisma.estoque.findUnique({ where: { id: estoque.id } });
    expect(estoqueNoBanco?.quantidade).toBe(7);
  });

  it('deve recusar estoque insuficiente sem gravar pedido nem itens e sem mexer no estoque', async () => {
    // Arrange
    const cliente = await criarCliente();
    const a = await criarProdutoComEstoque('ALF-1', 4, 10);
    const b = await criarProdutoComEstoque('CEN-1', 2, 1);

    // Act
    const resposta = await POST(requisicao('POST', {
      id_cliente: cliente.id,
      itens: [{ id_produto: a.produto.id, quantidade: 2 }, { id_produto: b.produto.id, quantidade: 5 }],
    }));

    // Assert
    expect(resposta.status).toBe(400);
    expect(await prisma.pedido.count()).toBe(0);
    expect(await prisma.itemPedido.count()).toBe(0);
    const estoqueA = await prisma.estoque.findUnique({ where: { id: a.estoque.id } });
    const estoqueB = await prisma.estoque.findUnique({ where: { id: b.estoque.id } });
    expect(estoqueA?.quantidade).toBe(10); // a baixa já feita no produto A foi desfeita (rollback)
    expect(estoqueB?.quantidade).toBe(1);
  });

  it('deve trocar os itens no PUT e reajustar o estoque', async () => {
    // Arrange
    const cliente = await criarCliente();
    const a = await criarProdutoComEstoque('ALF-1', 4, 7); // 3 unidades já baixadas pelo pedido
    const b = await criarProdutoComEstoque('CEN-1', 2, 10);
    const pedido = await prisma.pedido.create({
      data: {
        codigo_pedido: 'PED-1', id_cliente: cliente.id, preco: 12,
        itens: { create: [{ id_produto: a.produto.id, quantidade: 3, preco_unitario: 4 }] },
      },
    });

    // Act
    const resposta = await PUT(
      requisicao('PUT', { itens: [{ id_produto: b.produto.id, quantidade: 4 }] }),
      params(pedido.id),
    );

    // Assert
    expect(resposta.status).toBe(200);
    const itens = await prisma.itemPedido.findMany({ where: { id_pedido: pedido.id } });
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ id_produto: b.produto.id, quantidade: 4, preco_unitario: 2 });
    const estoqueA = await prisma.estoque.findUnique({ where: { id: a.estoque.id } });
    const estoqueB = await prisma.estoque.findUnique({ where: { id: b.estoque.id } });
    expect(estoqueA?.quantidade).toBe(10);
    expect(estoqueB?.quantidade).toBe(6);
  });

  it('deve devolver o estoque e apagar os itens no DELETE', async () => {
    // Arrange
    const cliente = await criarCliente();
    const a = await criarProdutoComEstoque('ALF-1', 4, 7); // 3 unidades já baixadas pelo pedido
    const pedido = await prisma.pedido.create({
      data: {
        codigo_pedido: 'PED-1', id_cliente: cliente.id, preco: 12,
        itens: { create: [{ id_produto: a.produto.id, quantidade: 3, preco_unitario: 4 }] },
      },
    });

    // Act
    const resposta = await DELETE(requisicao('DELETE'), params(pedido.id));

    // Assert
    expect(resposta.status).toBe(200);
    expect(await prisma.pedido.findUnique({ where: { id: pedido.id } })).toBeNull();
    expect(await prisma.itemPedido.count()).toBe(0);
    const estoqueA = await prisma.estoque.findUnique({ where: { id: a.estoque.id } });
    expect(estoqueA?.quantidade).toBe(10);
  });
});
