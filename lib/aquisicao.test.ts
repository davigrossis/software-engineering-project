import { pickFields, requireFields, ValidationError } from './api';

// Cópia do schema de app/api/acquisitions/route.ts (o schema não é exportado pela rota).
const AQUISICAO_FIELDS = {
  id_fornecedor: 'int',
  id_produto: 'int',
  quantidade: 'number',
  preco: 'number', // preço unitário
  desconto: 'number',
  entrada: 'date',
  observacoes: 'optionalString',
} as const;

const OBRIGATORIOS = ['id_fornecedor', 'id_produto', 'quantidade', 'preco'];

describe('Aquisicao', () => {
  it('deve converter quantidade e preço em texto para número', () => {
    // Arrange
    const corpo = { quantidade: '10', preco: '8,5' };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados.quantidade).toBe(10);
    expect(dados.preco).toBe(8.5);
  });

  it('deve manter quantidade e preço quando já são números', () => {
    // Arrange
    const corpo = { quantidade: 2.5, preco: 4 };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados.quantidade).toBe(2.5);
    expect(dados.preco).toBe(4);
  });

  it.each([
    ['quantidade em texto', { quantidade: 'abc' }],
    ['quantidade vazia', { quantidade: '' }],
    ['preço nulo', { preco: null }],
    ['preço infinito', { preco: 'Infinity' }],
    ['desconto em texto', { desconto: 'dez' }],
  ])('deve recusar valor numérico inválido (%s)', (_caso, corpo) => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
  });

  it.each([
    ['texto vazio', ''],
    ['nulo', null],
  ])('deve transformar observações com %s em null', (_caso, observacoes) => {
    // Arrange
    const corpo = { observacoes };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados.observacoes).toBeNull();
  });

  it('deve manter observações preenchidas como texto', () => {
    // Arrange
    const corpo = { observacoes: 'Entrega parcial' };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados.observacoes).toBe('Entrega parcial');
  });

  it('deve converter a entrada em Date', () => {
    // Arrange
    const corpo = { entrada: '2026-11-23T10:00:00.000Z' };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados.entrada).toBeInstanceOf(Date);
    expect((dados.entrada as Date).toISOString()).toBe('2026-11-23T10:00:00.000Z');
  });

  it('deve recusar entrada com data inválida', () => {
    // Arrange
    const corpo = { entrada: 'ontem' };

    // Act
    const executar = () => pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
  });

  it('deve converter fornecedor e produto em inteiros', () => {
    // Arrange
    const corpo = { id_fornecedor: '3', id_produto: 7.9 };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados.id_fornecedor).toBe(3);
    expect(dados.id_produto).toBe(7);
  });

  it('deve ignorar campos desconhecidos e não incluir campos ausentes', () => {
    // Arrange
    const corpo = { quantidade: 5, valor_total: 999, id: 1 };

    // Act
    const dados = pickFields(corpo, AQUISICAO_FIELDS);

    // Assert
    expect(dados).toEqual({ quantidade: 5 });
    expect(dados).not.toHaveProperty('valor_total');
    expect(dados).not.toHaveProperty('id');
  });

  it('deve aceitar a aquisição com todos os campos obrigatórios', () => {
    // Arrange
    const dados = pickFields(
      { id_fornecedor: 1, id_produto: 2, quantidade: 10, preco: 8.5 },
      AQUISICAO_FIELDS,
    );

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).not.toThrow();
  });

  it.each(OBRIGATORIOS)('deve exigir o campo obrigatório %s', (campo) => {
    // Arrange
    const completo: Record<string, unknown> = { id_fornecedor: 1, id_produto: 2, quantidade: 10, preco: 8.5 };
    delete completo[campo];
    const dados = pickFields(completo, AQUISICAO_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow(campo);
  });
});
