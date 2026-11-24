import { GET, POST } from '@/app/api/customers/route';
import { DELETE, PUT } from '@/app/api/customers/[id]/route';
import { prisma } from '@/lib/prisma';
import { params, requisicao } from './helpers';

const dadosCliente = (sufixo: string) => ({
  instituicao: `Escola ${sufixo}`,
  cnpj: `00.000.000/0001-0${sufixo}`,
  telefone: '(32) 99999-0000',
  responsavel: `Responsável ${sufixo}`,
});

describe('Cliente (integração)', () => {
  it('deve gravar o cliente no banco ignorando campos não permitidos', async () => {
    // Arrange
    const corpo = { ...dadosCliente('1'), id: 999, pedidos: [], campoExtra: 'invasor' };

    // Act
    const resposta = await POST(requisicao('POST', corpo));

    // Assert
    expect(resposta.status).toBe(201);
    const noBanco = await prisma.cliente.findMany();
    expect(noBanco).toHaveLength(1);
    expect(noBanco[0]).toMatchObject({ ...dadosCliente('1'), email: '', endereco: '', status: 'ativo' });
    expect(noBanco[0].id).not.toBe(999);
    expect(noBanco[0]).not.toHaveProperty('campoExtra');
  });

  it('deve recusar CNPJ duplicado com 409 e manter um único registro', async () => {
    // Arrange
    const original = await prisma.cliente.create({ data: dadosCliente('1') });

    // Act
    const resposta = await POST(requisicao('POST', { ...dadosCliente('2'), cnpj: original.cnpj }));

    // Assert
    expect(resposta.status).toBe(409);
    expect(await prisma.cliente.count()).toBe(1);
    expect(await prisma.cliente.findUnique({ where: { id: original.id } })).toEqual(original);
  });

  it('deve atualizar os dados do cliente no banco', async () => {
    // Arrange
    const cliente = await prisma.cliente.create({ data: dadosCliente('1') });

    // Act
    const resposta = await PUT(
      requisicao('PUT', { telefone: '(32) 3333-4444', responsavel: 'Nova Diretora' }),
      params(cliente.id),
    );

    // Assert
    expect(resposta.status).toBe(200);
    const noBanco = await prisma.cliente.findUnique({ where: { id: cliente.id } });
    expect(noBanco).toMatchObject({
      telefone: '(32) 3333-4444',
      responsavel: 'Nova Diretora',
      cnpj: cliente.cnpj,
      instituicao: cliente.instituicao,
    });
  });

  it('deve remover o cliente do banco', async () => {
    // Arrange
    const cliente = await prisma.cliente.create({ data: dadosCliente('1') });

    // Act
    const resposta = await DELETE(requisicao('DELETE'), params(cliente.id));

    // Assert
    expect(resposta.status).toBe(200);
    expect(await prisma.cliente.findUnique({ where: { id: cliente.id } })).toBeNull();
  });

  it('deve listar os clientes do mais novo ao mais antigo', async () => {
    // Arrange
    const a = await prisma.cliente.create({ data: dadosCliente('1') });
    const b = await prisma.cliente.create({ data: dadosCliente('2') });
    const c = await prisma.cliente.create({ data: dadosCliente('3') });

    // Act
    const resposta = await GET();

    // Assert
    expect(resposta.status).toBe(200);
    const lista: { id: number }[] = await resposta.json();
    expect(lista.map(cliente => cliente.id)).toEqual([c.id, b.id, a.id]);
  });
});
