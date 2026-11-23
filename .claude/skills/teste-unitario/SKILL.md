---
name: teste-unitario
description: Escreve testes de unidade (Vitest, padrão AAA) para uma classe do projeto — Cliente, Fornecedor, Produto, Estoque, Aquisicao, Pedido ou ItemPedido — cobrindo suas regras de negócio isoladas em lib/. Use quando pedirem testes unitários de uma classe.
argument-hint: <Classe>   ex.: Pedido
---

# Testes de unidade — $ARGUMENTS

Testes de unidade testam funções e classes **isoladas**: sem banco, sem rede, sem servidor.
Neste projeto as regras de negócio que podem ser testadas assim ficam em `lib/`:

- `lib/api.ts` — `pickFields`, `requireFields`, `parseId`, `ValidationError`
- `lib/fields.ts` — campos aceitos por classe (`CLIENTE_FIELDS`, `FORNECEDOR_FIELDS`, `PRODUTO_FIELDS`, `PEDIDO_FIELDS`)
- `lib/pedidos.ts` — `parseItens`, `aplicarItens`, `devolverItens`

As rotas `app/api/**` falam com o banco: elas são assunto de **teste de integração**, não desta skill.

## Configuração (já feita)
O Vitest 5 já está configurado no projeto: `vitest.config.mts`, scripts `npm test` / `npm run test:watch`
e `"types": ["node", "vitest/globals"]` no `tsconfig.json`. **Não altere essa configuração** nem o
`package.json` nas issues de teste — se algo faltar, avise o dono do repositório (@davigrossis).

## Passos
1. Veja na tabela abaixo as regras da classe `$ARGUMENTS` e confira no código se ainda valem.
   Achou uma regra no código que não está na tabela? Inclua.
2. Liste os testes que vai escrever (um `it` por regra) e mostre ao usuário **antes** de escrever.
3. Escreva no arquivo de teste indicado na tabela, seguindo o modelo AAA.
4. Rode `npx vitest run <arquivo>` até passar e mostre a saída real do comando.

## Regras
- Todo teste tem os três blocos comentados: `// Arrange`, `// Act`, `// Assert`.
- Um comportamento por `it`, com nome em português: `it('deve ...')`.
- Agrupe por classe: `describe('<Classe>', ...)`.
- Casos parecidos (ex.: várias entradas inválidas) → `it.each`.
- Sem banco e sem rede. Único dublê permitido: o `tx` falso com `vi.fn()` para as funções de `lib/pedidos.ts`.
- Teste também o caso de erro, verificando o que **não** deve acontecer.
- Nunca apague ou pule um teste que falha: corrija o teste ou avise que encontrou um bug no código.

## Modelo AAA
```ts
import { ValidationError } from './api';
import { parseItens } from './pedidos';

describe('ItemPedido', () => {
  it('deve somar a quantidade de itens repetidos do mesmo produto', () => {
    // Arrange
    const itens = [
      { id_produto: 1, quantidade: 2 },
      { id_produto: 1, quantidade: 3 },
    ];

    // Act
    const resultado = parseItens(itens);

    // Assert
    expect(resultado).toEqual([{ id_produto: 1, quantidade: 5 }]);
  });

  it.each([
    ['quantidade zero', [{ id_produto: 1, quantidade: 0 }]],
    ['produto inválido', [{ id_produto: 'abc', quantidade: 1 }]],
    ['não é uma lista', 'texto'],
  ])('deve recusar itens com %s', (_caso, itens) => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => parseItens(itens);

    // Assert
    expect(executar).toThrow(ValidationError);
  });
});
```

### Com `tx` falso (funções que recebem a transação do Prisma)
```ts
import type { Prisma } from '@/app/generated/prisma';
import { aplicarItens } from './pedidos';

describe('Estoque', () => {
  it('deve recusar o pedido quando o estoque é insuficiente, sem gravar o item', async () => {
    // Arrange
    const tx = {
      produto: { findUnique: vi.fn().mockResolvedValue({ id: 1, nome: 'Feijão', preco: 8.5, id_estoque: 10 }) },
      estoque: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) }, // nenhuma linha atualizada = sem estoque
      itemPedido: { create: vi.fn() },
    };

    // Act
    const executar = aplicarItens(tx as unknown as Prisma.TransactionClient, 7, [{ id_produto: 1, quantidade: 99 }]);

    // Assert
    await expect(executar).rejects.toThrow('Estoque insuficiente');
    expect(tx.itemPedido.create).not.toHaveBeenCalled();
  });
});
```

## Regras de negócio por classe
Cada classe tem **o seu próprio arquivo de teste**, para que cada pessoa do time trabalhe sem conflito de merge.

| Classe | Arquivo de teste | O que cobrir |
|---|---|---|
| Cliente | `lib/cliente.test.ts` | com `CLIENTE_FIELDS`: `requireFields` exige instituição, CNPJ, telefone e responsável; `pickFields` ignora campo desconhecido. **Também as funções de base:** `parseId` recusa `"abc"`, `"0"` e `"-1"`; `requireFields` lista os campos ausentes; corpo que não é objeto lança erro |
| Fornecedor | `lib/fornecedor.test.ts` | com `FORNECEDOR_FIELDS`: `nome` obrigatório; campo desconhecido ignorado; valores viram texto |
| Produto | `lib/produto.test.ts` | com `PRODUTO_FIELDS`: preço vira número (aceita vírgula: `"8,5"` → `8.5`); preço inválido lança `ValidationError`; obrigatórios nome, código, categoria e preço |
| Pedido | `lib/pedido.test.ts` | com `PEDIDO_FIELDS`: `id_cliente` vira inteiro; `data` vira `Date`; data inválida lança `ValidationError`; desconto numérico |
| ItemPedido | `lib/item-pedido.test.ts` | `parseItens`: precisa ser lista, id inteiro > 0, quantidade > 0, agrupa repetidos |
| Estoque | `lib/estoque.test.ts` | `aplicarItens` (com `tx` falso): dá baixa com `decrement`, usa o preço do cadastro, retorna o subtotal, recusa estoque insuficiente e produto sem estoque; `devolverItens`: devolve com `increment` e apaga os itens |
| Aquisicao | `lib/aquisicao.test.ts` | `pickFields` com os campos de aquisição (copie o schema de `app/api/acquisitions/route.ts` para o teste): quantidade e preço numéricos, `observacoes` vazia vira `null`, `entrada` vira `Date` |

Nos exemplos acima, ajuste os imports ao arquivo da sua classe (ex.: `import { pickFields } from './api'`,
`import { PRODUTO_FIELDS } from './fields'`).
