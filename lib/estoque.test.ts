import type { Prisma } from '../app/generated/prisma';
import { ValidationError } from './api';
import { aplicarItens, devolverItens } from './pedidos';

type Tx = Prisma.TransactionClient;

interface ProdutoFalso {
  id: number;
  nome: string;
  preco: number;
  id_estoque: number | null;
}

/** Monta um `tx` falso para `aplicarItens`, com os produtos indexados por ID. */
function criarTxAplicar(produtos: ProdutoFalso[], countBaixa = 1) {
  const porId = new Map(produtos.map((p) => [p.id, p]));
  return {
    produto: {
      findUnique: vi.fn(({ where }: { where: { id: number } }) => Promise.resolve(porId.get(where.id) ?? null)),
    },
    estoque: { updateMany: vi.fn().mockResolvedValue({ count: countBaixa }) },
    itemPedido: { create: vi.fn().mockResolvedValue({}) },
  };
}

/** Monta um `tx` falso para `devolverItens`, com os itens já gravados do pedido. */
function criarTxDevolver(itens: { quantidade: number; produto: { id_estoque: number | null } }[]) {
  return {
    itemPedido: {
      findMany: vi.fn().mockResolvedValue(itens),
      deleteMany: vi.fn().mockResolvedValue({ count: itens.length }),
    },
    estoque: { update: vi.fn().mockResolvedValue({}) },
  };
}

const FEIJAO: ProdutoFalso = { id: 1, nome: 'Feijão', preco: 8.5, id_estoque: 10 };
const ARROZ: ProdutoFalso = { id: 2, nome: 'Arroz', preco: 4, id_estoque: 20 };

describe('Estoque', () => {
  describe('aplicarItens', () => {
    it('deve dar baixa no estoque com decrement e só quando há quantidade suficiente (gte)', async () => {
      // Arrange
      const tx = criarTxAplicar([FEIJAO]);

      // Act
      await aplicarItens(tx as unknown as Tx, 7, [{ id_produto: 1, quantidade: 3 }]);

      // Assert
      expect(tx.estoque.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.estoque.updateMany).toHaveBeenCalledWith({
        where: { id: 10, quantidade: { gte: 3 } },
        data: { quantidade: { decrement: 3 } },
      });
    });

    it('deve usar o preço do cadastro do produto como preço unitário do item', async () => {
      // Arrange
      const tx = criarTxAplicar([FEIJAO]);

      // Act
      await aplicarItens(tx as unknown as Tx, 7, [{ id_produto: 1, quantidade: 2 }]);

      // Assert
      expect(tx.itemPedido.create).toHaveBeenCalledWith({
        data: { id_pedido: 7, id_produto: 1, quantidade: 2, preco_unitario: 8.5 },
      });
    });

    it('deve retornar o subtotal somando quantidade × preço de todos os itens', async () => {
      // Arrange
      const tx = criarTxAplicar([FEIJAO, ARROZ]);
      const itens = [
        { id_produto: 1, quantidade: 2 },
        { id_produto: 2, quantidade: 3 },
      ];

      // Act
      const subtotal = await aplicarItens(tx as unknown as Tx, 7, itens);

      // Assert
      expect(subtotal).toBe(29); // 2 × 8,5 + 3 × 4
      expect(tx.itemPedido.create).toHaveBeenCalledTimes(2);
    });

    it('deve recusar o pedido quando o estoque é insuficiente, sem gravar o item', async () => {
      // Arrange
      const tx = criarTxAplicar([FEIJAO], 0); // nenhuma linha atualizada = sem estoque

      // Act
      const executar = aplicarItens(tx as unknown as Tx, 7, [{ id_produto: 1, quantidade: 99 }]);

      // Assert
      await expect(executar).rejects.toThrow(ValidationError);
      await expect(executar).rejects.toThrow('Estoque insuficiente para o produto "Feijão"');
      expect(tx.itemPedido.create).not.toHaveBeenCalled();
    });

    it('deve recusar produto sem estoque cadastrado, sem dar baixa nem gravar o item', async () => {
      // Arrange
      const tx = criarTxAplicar([{ ...FEIJAO, id_estoque: null }]);

      // Act
      const executar = aplicarItens(tx as unknown as Tx, 7, [{ id_produto: 1, quantidade: 1 }]);

      // Assert
      await expect(executar).rejects.toThrow(ValidationError);
      await expect(executar).rejects.toThrow('O produto "Feijão" não possui estoque cadastrado');
      expect(tx.estoque.updateMany).not.toHaveBeenCalled();
      expect(tx.itemPedido.create).not.toHaveBeenCalled();
    });

    it('deve recusar produto não encontrado, sem dar baixa nem gravar o item', async () => {
      // Arrange
      const tx = criarTxAplicar([]);

      // Act
      const executar = aplicarItens(tx as unknown as Tx, 7, [{ id_produto: 99, quantidade: 1 }]);

      // Assert
      await expect(executar).rejects.toThrow(ValidationError);
      await expect(executar).rejects.toThrow('Produto com ID 99 não encontrado');
      expect(tx.estoque.updateMany).not.toHaveBeenCalled();
      expect(tx.itemPedido.create).not.toHaveBeenCalled();
    });

    it('deve retornar subtotal zero e não acessar o banco quando não há itens', async () => {
      // Arrange
      const tx = criarTxAplicar([FEIJAO]);

      // Act
      const subtotal = await aplicarItens(tx as unknown as Tx, 7, []);

      // Assert
      expect(subtotal).toBe(0);
      expect(tx.produto.findUnique).not.toHaveBeenCalled();
      expect(tx.estoque.updateMany).not.toHaveBeenCalled();
      expect(tx.itemPedido.create).not.toHaveBeenCalled();
    });
  });

  describe('devolverItens', () => {
    it('deve devolver ao estoque a quantidade de cada item com increment', async () => {
      // Arrange
      const tx = criarTxDevolver([
        { quantidade: 2, produto: { id_estoque: 10 } },
        { quantidade: 5, produto: { id_estoque: 20 } },
      ]);

      // Act
      await devolverItens(tx as unknown as Tx, 7);

      // Assert
      expect(tx.itemPedido.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_pedido: 7 } }),
      );
      expect(tx.estoque.update).toHaveBeenCalledTimes(2);
      expect(tx.estoque.update).toHaveBeenNthCalledWith(1, {
        where: { id: 10 },
        data: { quantidade: { increment: 2 } },
      });
      expect(tx.estoque.update).toHaveBeenNthCalledWith(2, {
        where: { id: 20 },
        data: { quantidade: { increment: 5 } },
      });
    });

    it('deve apagar os itens do pedido depois de devolver o estoque', async () => {
      // Arrange
      const tx = criarTxDevolver([{ quantidade: 2, produto: { id_estoque: 10 } }]);

      // Act
      await devolverItens(tx as unknown as Tx, 7);

      // Assert
      expect(tx.itemPedido.deleteMany).toHaveBeenCalledWith({ where: { id_pedido: 7 } });
      const ordemDevolucao = tx.estoque.update.mock.invocationCallOrder[0];
      const ordemExclusao = tx.itemPedido.deleteMany.mock.invocationCallOrder[0];
      expect(ordemDevolucao).toBeLessThan(ordemExclusao);
    });

    it('deve ignorar na devolução o item cujo produto não tem estoque, mas ainda apagar os itens', async () => {
      // Arrange
      const tx = criarTxDevolver([
        { quantidade: 4, produto: { id_estoque: null } },
        { quantidade: 1, produto: { id_estoque: 10 } },
      ]);

      // Act
      await devolverItens(tx as unknown as Tx, 7);

      // Assert
      expect(tx.estoque.update).toHaveBeenCalledTimes(1);
      expect(tx.estoque.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { quantidade: { increment: 1 } },
      });
      expect(tx.itemPedido.deleteMany).toHaveBeenCalledWith({ where: { id_pedido: 7 } });
    });
  });
});
