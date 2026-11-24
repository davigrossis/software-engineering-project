// TESTE DE SISTEMA (end-to-end)
//
// Testa o sistema completo e integrado: servidor Next.js + rotas da API + banco PostgreSQL.
// Cobre requisitos funcionais (regras de negócio de cada classe) e um requisito não funcional
// (tempo de resposta de cada requisição).
//
// Pré-requisitos: banco com as migrations aplicadas (`npx prisma migrate deploy`) e o app rodando (`npm run dev`).
// Uso:  node tests/sistema/sistema.mjs
//       BASE_URL=http://localhost:3100 LIMITE_MS=2000 node tests/sistema/sistema.mjs
//
// ATENÇÃO: o teste cria registros no banco que o servidor estiver usando (todos com o sufixo "E2E-<execução>")
// e apaga o que criou ao final. Use um banco de desenvolvimento/teste, nunca o de produção.

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const LIMITE_MS = Number(process.env.LIMITE_MS ?? 3000); // tempo máximo aceitável por requisição
const RUN = Date.now().toString().slice(-8);
const tempos = [];
let passed = 0;
let failed = 0;

async function api(method, path, body) {
  const inicio = performance.now();
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* corpo vazio */ }
  tempos.push({ rota: `${method} ${path}`, ms: performance.now() - inicio });
  return { status: res.status, body: json };
}

function check(name, cond, detail) {
  if (cond) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`); }
}

const near = (a, b) => Math.abs(a - b) < 1e-6;

async function estoqueDoProduto(idProduto) {
  const p = await api('GET', `/products/${idProduto}`);
  if (!p.body?.id_estoque) return null;
  return (await api('GET', `/stock/${p.body.id_estoque}`)).body;
}

async function main() {
  console.log(`Teste de sistema contra ${BASE} (execução ${RUN})\n`);

  // ---------------------------------------------------------------- cadastros
  console.log('Cadastros (Cliente, Fornecedor, Produto)');
  const forn = await api('POST', '/suppliers', { nome: `Fornecedor E2E ${RUN}`, telefone: '11999990000' });
  check('cria fornecedor (201)', forn.status === 201, forn);

  const cli = await api('POST', '/customers', {
    instituicao: `Escola E2E ${RUN}`, cnpj: `${RUN}000100`, telefone: '11988887777', responsavel: 'Maria',
  });
  check('cria cliente (201)', cli.status === 201, cli);

  const prod = await api('POST', '/products', {
    nome: `Feijão E2E ${RUN}`, codigo_produto: `E2E-${RUN}`, categoria: 'Grãos', preco: 8.5, unidade: 'kg',
  });
  check('cria produto (201)', prod.status === 201, prod);

  if (![forn, cli, prod].every(r => r.status === 201)) {
    throw new Error('Não foi possível criar os cadastros básicos; o servidor e o banco estão no ar?');
  }

  const semObrig = await api('POST', '/customers', { instituicao: 'Sem CNPJ' });
  check('cliente sem campos obrigatórios -> 400', semObrig.status === 400, semObrig);

  const dup = await api('POST', '/products', {
    nome: 'Dup', codigo_produto: `E2E-${RUN}`, categoria: 'X', preco: 1, unidade: 'kg',
  });
  check('código de produto duplicado -> 409', dup.status === 409, dup);

  const fornId = forn.body.id, cliId = cli.body.id, prodId = prod.body.id;

  // --------------------------------------------------------------- aquisições
  console.log('\nAquisições e estoque');
  const aq1 = await api('POST', '/acquisitions', {
    id_fornecedor: fornId, id_produto: prodId, quantidade: 10, preco: 8.5, entrada: '2026-11-01',
  });
  check('1ª aquisição (201)', aq1.status === 201, aq1);
  let est = await estoqueDoProduto(prodId);
  check('estoque criado com 10', est && near(est.quantidade, 10), est);
  check('estoque copia nome/categoria/preço do produto',
    est && est.nome === `Feijão E2E ${RUN}` && est.categoria === 'Grãos' && near(est.preco, 8.5), est);

  const aq2 = await api('POST', '/acquisitions', {
    id_fornecedor: fornId, id_produto: prodId, quantidade: 5, preco: 8.5, desconto: 2,
  });
  check('2ª aquisição (201)', aq2.status === 201, aq2);
  est = await estoqueDoProduto(prodId);
  check('estoque somado para 15', est && near(est.quantidade, 15), est);

  const lista = (await api('GET', '/acquisitions')).body;
  const minhas = lista.filter(a => a.produto?.id === prodId);
  check('histórico preservado: as 2 aquisições apontam para o produto', minhas.length === 2, minhas.length);
  const aq2Lista = minhas.find(a => a.id === aq2.body.aquisicao.id);
  check('valor_total = preço × qtd − desconto', aq2Lista && near(aq2Lista.valor_total, 8.5 * 5 - 2), aq2Lista);

  const aqGet = await api('GET', `/acquisitions/${aq1.body.aquisicao.id}`);
  check('GET aquisição traz o produto', aqGet.body?.produto?.id === prodId, aqGet.body);

  const aqPut = await api('PUT', `/acquisitions/${aq1.body.aquisicao.id}`, {
    id_fornecedor: fornId, id_produto: prodId, quantidade: 10, preco: 8.5, desconto: 1,
    entrada: '2026-11-02', observacoes: 'editada', campo_invalido: 'x',
  });
  check('PUT aquisição (200) mantém preço unitário', aqPut.status === 200 && near(aqPut.body.preco, 8.5), aqPut);

  const aqInexistente = await api('POST', '/acquisitions', {
    id_fornecedor: fornId, id_produto: 99999999, quantidade: 1, preco: 1,
  });
  check('aquisição de produto inexistente -> 400', aqInexistente.status === 400, aqInexistente);

  // ------------------------------------------------------------------ pedidos
  console.log('\nPedidos e itens do pedido');
  const ped = await api('POST', '/orders', {
    codigo_pedido: `PED-E2E-${RUN}`, id_cliente: cliId, status: 'Pendente', data: '2026-11-20', desconto: 4,
    preco: 0.01, // deve ser ignorado: o servidor recalcula
    itens: [{ id_produto: prodId, quantidade: 3 }, { id_produto: prodId, quantidade: 1 }],
  });
  check('cria pedido com itens (201)', ped.status === 201, ped);
  const pedId = ped.body?.id;
  check('total recalculado no servidor (4 × 8,50 − 4 = 30)', ped.body && near(ped.body.preco, 30), ped.body?.preco);
  check('itens repetidos do mesmo produto agrupados', ped.body?.itens?.length === 1 && near(ped.body.itens[0].quantidade, 4), ped.body?.itens);
  est = await estoqueDoProduto(prodId);
  check('baixa no estoque: 15 → 11', est && near(est.quantidade, 11), est);

  const pedGet = await api('GET', `/orders/${pedId}`);
  check('GET pedido traz itens e desconto',
    pedGet.body?.itens?.[0]?.id_produto === prodId && near(pedGet.body.desconto, 4), pedGet.body);

  const semEstoque = await api('POST', '/orders', {
    codigo_pedido: `PED-E2E-${RUN}-X`, id_cliente: cliId, itens: [{ id_produto: prodId, quantidade: 1000 }],
  });
  check('pedido acima do estoque -> 400', semEstoque.status === 400, semEstoque);
  est = await estoqueDoProduto(prodId);
  check('estoque intacto após pedido recusado (11)', est && near(est.quantidade, 11), est);
  const pedidos = (await api('GET', '/orders')).body;
  check('pedido recusado não foi gravado (rollback)', !pedidos.some(p => p.codigo_pedido === `PED-E2E-${RUN}-X`));

  const qtdZero = await api('POST', '/orders', {
    codigo_pedido: `PED-E2E-${RUN}-Z`, id_cliente: cliId, itens: [{ id_produto: prodId, quantidade: 0 }],
  });
  check('item com quantidade 0 -> 400', qtdZero.status === 400, qtdZero);

  const pedPut = await api('PUT', `/orders/${pedId}`, {
    status: 'Aprovado', desconto: 0, itens: [{ id_produto: prodId, quantidade: 6 }],
  });
  check('edita pedido: troca itens (200)', pedPut.status === 200, pedPut);
  check('total recalculado na edição (6 × 8,50 = 51)', pedPut.body && near(pedPut.body.preco, 51), pedPut.body?.preco);
  est = await estoqueDoProduto(prodId);
  check('estoque ajustado na edição: devolve 4, baixa 6 → 9', est && near(est.quantidade, 9), est);

  const pedPutSemItens = await api('PUT', `/orders/${pedId}`, { status: 'Pendente', id: 123456, hack: true });
  check('PUT só com status (campos desconhecidos ignorados)', pedPutSemItens.status === 200 && pedPutSemItens.body.id === pedId, pedPutSemItens);
  est = await estoqueDoProduto(prodId);
  check('PUT sem itens não mexe no estoque (9)', est && near(est.quantidade, 9), est);

  // ----------------------------------------------------- validação / produtos
  console.log('\nValidação de entrada e produtos');
  const precoInvalido = await api('PUT', `/products/${prodId}`, { preco: 'abc' });
  check('preço não numérico -> 400', precoInvalido.status === 400, precoInvalido);

  const prodPut = await api('PUT', `/products/${prodId}`, { preco: 9, nome: `Feijão Carioca E2E ${RUN}` });
  check('edita produto (200)', prodPut.status === 200, prodPut);
  est = await estoqueDoProduto(prodId);
  check('estoque sincronizado com o produto (nome/preço)', est && near(est.preco, 9) && est.nome === `Feijão Carioca E2E ${RUN}`, est);

  const delProdComPedido = await api('DELETE', `/products/${prodId}`);
  check('excluir produto que está em pedido -> 409', delProdComPedido.status === 409, delProdComPedido);

  check('GET id inexistente -> 404', (await api('GET', '/customers/99999999')).status === 404);
  check('GET id inválido -> 400', (await api('GET', '/customers/abc')).status === 400);
  check('PUT id inexistente -> 404', (await api('PUT', '/suppliers/99999999', { nome: 'x' })).status === 404);

  const estNeg = await api('PUT', `/stock/${est.id}`, { quantidade: -1 });
  check('estoque negativo -> 400', estNeg.status === 400, estNeg);

  // --------------------------------------------------- estoque manual (stock/new)
  console.log('\nEstoque manual');
  const prod2 = await api('POST', '/products', {
    nome: `Arroz E2E ${RUN}`, codigo_produto: `E2E2-${RUN}`, categoria: 'Grãos', preco: 6, unidade: 'kg',
  });
  const est2 = await api('POST', '/stock', { id_produto: prod2.body.id, quantidade: 3 });
  check('cria estoque a partir do produto (201)', est2.status === 201, est2);
  check('estoque manual copia dados do produto', est2.body?.nome === `Arroz E2E ${RUN}` && near(est2.body.preco, 6), est2.body);
  const est2Get = await api('GET', `/stock/${est2.body.id}`);
  check('GET estoque traz o produto vinculado', est2Get.body?.produtos?.[0]?.id === prod2.body.id, est2Get.body);
  const est2Dup = await api('POST', '/stock', { id_produto: prod2.body.id, quantidade: 1 });
  check('segundo estoque para o mesmo produto -> 400', est2Dup.status === 400, est2Dup);

  // -------------------------------------------------------- exclusão / limpeza
  console.log('\nExclusão');
  const delPed = await api('DELETE', `/orders/${pedId}`);
  check('exclui pedido (200)', delPed.status === 200, delPed);
  est = await estoqueDoProduto(prodId);
  check('estoque devolvido ao excluir pedido: 9 → 15', est && near(est.quantidade, 15), est);
  check('pedido excluído -> 404', (await api('GET', `/orders/${pedId}`)).status === 404);

  const delProd = await api('DELETE', `/products/${prodId}`);
  check('exclui produto sem pedidos (200)', delProd.status === 200, delProd);
  const aqOrfa = await api('GET', `/acquisitions/${aq1.body.aquisicao.id}`);
  check('aquisição continua existindo, sem produto (SET NULL)', aqOrfa.status === 200 && aqOrfa.body.produto === null, aqOrfa.body);

  // limpeza: remove tudo o que o teste criou
  for (const a of [aq1.body.aquisicao.id, aq2.body.aquisicao.id]) await api('DELETE', `/acquisitions/${a}`);
  await api('DELETE', `/stock/${est.id}`);
  await api('DELETE', `/products/${prod2.body.id}`);
  await api('DELETE', `/stock/${est2.body.id}`);
  await api('DELETE', `/suppliers/${fornId}`);
  await api('DELETE', `/customers/${cliId}`);

  // ------------------------------------------- requisito não funcional: tempo
  console.log(`\nRequisito não funcional: tempo de resposta (limite ${LIMITE_MS} ms por requisição)`);
  const ordenados = tempos.map(t => t.ms).sort((a, b) => a - b);
  const media = ordenados.reduce((s, ms) => s + ms, 0) / ordenados.length;
  const p95 = ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * 0.95))];
  const maisLenta = tempos.reduce((a, b) => (b.ms > a.ms ? b : a), { rota: '-', ms: 0 });
  console.log(`  ${tempos.length} requisições · média ${media.toFixed(0)} ms · p95 ${p95.toFixed(0)} ms · `
    + `mais lenta ${maisLenta.ms.toFixed(0)} ms (${maisLenta.rota})`);
  const lentas = tempos.filter(t => t.ms > LIMITE_MS);
  check(`todas as requisições abaixo de ${LIMITE_MS} ms`, lentas.length === 0,
    lentas.map(t => `${t.rota}: ${t.ms.toFixed(0)} ms`));

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('\nErro inesperado no teste:', err.message ?? err);
  process.exit(1);
});
