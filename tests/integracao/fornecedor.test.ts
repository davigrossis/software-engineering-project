import { POST } from '@/app/api/suppliers/route';
import { DELETE, PUT } from '@/app/api/suppliers/[id]/route';
import { prisma } from '@/lib/prisma';
import { params, requisicao } from './helpers';

describe('Fornecedor (integração)', () => {
  it('deve gravar o fornecedor no banco', async () => {
    // Arrange
    const corpo = { nome: 'João da Horta', telefone: '(32) 98888-7777' };

    // Act
    const resposta = await POST(requisicao('POST', corpo));

    // Assert
    expect(resposta.status).toBe(201);
    const noBanco = await prisma.fornecedor.findMany();
    expect(noBanco).toHaveLength(1);
    expect(noBanco[0]).toMatchObject({ ...corpo, status: 'Cooperado' });
  });

  it('deve atualizar os dados do fornecedor no banco', async () => {
    // Arrange
    const fornecedor = await prisma.fornecedor.create({ data: { nome: 'João da Horta' } });

    // Act
    const resposta = await PUT(
      requisicao('PUT', { area_atuacao: 'Hortaliças', email: 'joao@exemplo.com' }),
      params(fornecedor.id),
    );

    // Assert
    expect(resposta.status).toBe(200);
    const noBanco = await prisma.fornecedor.findUnique({ where: { id: fornecedor.id } });
    expect(noBanco).toMatchObject({
      nome: 'João da Horta',
      area_atuacao: 'Hortaliças',
      email: 'joao@exemplo.com',
    });
  });

  it('deve remover o fornecedor sem aquisições do banco', async () => {
    // Arrange
    const fornecedor = await prisma.fornecedor.create({ data: { nome: 'João da Horta' } });

    // Act
    const resposta = await DELETE(requisicao('DELETE'), params(fornecedor.id));

    // Assert
    expect(resposta.status).toBe(200);
    expect(await prisma.fornecedor.findUnique({ where: { id: fornecedor.id } })).toBeNull();
  });

  it('deve recusar com 409 a exclusão de fornecedor com aquisição e mantê-lo no banco', async () => {
    // Arrange
    const fornecedor = await prisma.fornecedor.create({ data: { nome: 'João da Horta' } });
    const produto = await prisma.produto.create({
      data: { nome: 'Alface', codigo_produto: 'ALF-1', categoria: 'Hortaliças', preco: 3 },
    });
    await prisma.aquisicao.create({
      data: { id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10, preco: 3 },
    });

    // Act
    const resposta = await DELETE(requisicao('DELETE'), params(fornecedor.id));

    // Assert
    expect(resposta.status).toBe(409);
    expect(await prisma.fornecedor.findUnique({ where: { id: fornecedor.id } })).not.toBeNull();
    expect(await prisma.aquisicao.count({ where: { id_fornecedor: fornecedor.id } })).toBe(1);
  });
});
