// Script de teste: popula o banco com um exemplo de cada entidade.
// Uso: npx tsx script.ts
import { prisma } from './lib/prisma'

async function main() {
  // Criar um fornecedor
  const fornecedor = await prisma.fornecedor.create({
    data: {
      nome: 'Fornecedor ABC',
      telefone: '11987654321',
    },
  })
  console.log('Fornecedor criado:', fornecedor)

  // Criar um produto já com o seu estoque
  const produto = await prisma.produto.create({
    data: {
      nome: 'Produto Teste',
      codigo_produto: 'PROD001',
      categoria: 'Eletrônicos',
      preco: 150.0,
      estoque: {
        create: {
          nome: 'Produto Teste',
          categoria: 'Eletrônicos',
          preco: 150.0,
          quantidade: 0,
        },
      },
    },
  })
  console.log('Produto criado:', produto)

  // Registrar uma aquisição do produto e somar ao estoque
  const aquisicao = await prisma.aquisicao.create({
    data: {
      id_fornecedor: fornecedor.id,
      id_produto: produto.id,
      quantidade: 10,
      preco: 100.5,
    },
    include: {
      fornecedor: true,
      produto: true,
    },
  })
  await prisma.estoque.update({
    where: { id: produto.id_estoque! },
    data: { quantidade: { increment: aquisicao.quantidade } },
  })
  console.log('Aquisição criada:', aquisicao)

  // Criar um cliente com um pedido de 2 unidades do produto
  const cliente = await prisma.cliente.create({
    data: {
      instituicao: 'Empresa XYZ',
      cnpj: '12345678000190',
      telefone: '11999999999',
      responsavel: 'João Silva',
      pedidos: {
        create: {
          codigo_pedido: 'PED001',
          preco: produto.preco * 2,
          itens: {
            create: { id_produto: produto.id, quantidade: 2, preco_unitario: produto.preco },
          },
        },
      },
    },
    include: {
      pedidos: { include: { itens: true } },
    },
  })
  await prisma.estoque.update({
    where: { id: produto.id_estoque! },
    data: { quantidade: { decrement: 2 } },
  })
  console.log('Cliente criado:', cliente)

  // Buscar todos os clientes
  const allClientes = await prisma.cliente.findMany({
    include: {
      pedidos: { include: { itens: true } },
    },
  })
  console.log('Todos os clientes:', JSON.stringify(allClientes, null, 2))
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
