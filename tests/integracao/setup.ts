import { prisma } from '@/lib/prisma';

const TABELAS = ['ItemPedido', 'Pedido', 'Aquisicao', 'Produto', 'Estoque', 'Cliente', 'Fornecedor'];

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE ${TABELAS.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
