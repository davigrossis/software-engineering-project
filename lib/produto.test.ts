import { pickFields, requireFields, ValidationError } from './api';
import { PRODUTO_FIELDS } from './fields';

const OBRIGATORIOS = ['nome', 'codigo_produto', 'categoria', 'preco'];

describe('Produto', () => {
  it('deve converter o preço em texto com vírgula para número', () => {
    // Arrange
    const corpo = { preco: '8,5' };

    // Act
    const dados = pickFields(corpo, PRODUTO_FIELDS);

    // Assert
    expect(dados.preco).toBe(8.5);
  });

  it('deve manter o preço quando já é número', () => {
    // Arrange
    const corpo = { preco: 8.5 };

    // Act
    const dados = pickFields(corpo, PRODUTO_FIELDS);

    // Assert
    expect(dados.preco).toBe(8.5);
  });

  it.each([
    ['texto não numérico', 'abc'],
    ['texto vazio', ''],
    ['nulo', null],
    ['infinito', 'Infinity'],
  ])('deve recusar preço inválido (%s)', (_caso, preco) => {
    // Arrange
    const corpo = { nome: 'Feijão', preco };

    // Act
    const executar = () => pickFields(corpo, PRODUTO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campo "preco" deve ser numérico');
  });

  it('deve ignorar campos desconhecidos', () => {
    // Arrange
    const corpo = { nome: 'Feijão', preco: 8.5, id: 99, id_estoque: 3, admin: true };

    // Act
    const dados = pickFields(corpo, PRODUTO_FIELDS);

    // Assert
    expect(dados).toEqual({ nome: 'Feijão', preco: 8.5 });
    expect(dados).not.toHaveProperty('id');
    expect(dados).not.toHaveProperty('id_estoque');
    expect(dados).not.toHaveProperty('admin');
  });

  it('deve converter nome, código, categoria e unidade para texto', () => {
    // Arrange
    const corpo = { nome: 123, codigo_produto: 456, categoria: 'Grãos', unidade: 'kg' };

    // Act
    const dados = pickFields(corpo, PRODUTO_FIELDS);

    // Assert
    expect(dados).toEqual({ nome: '123', codigo_produto: '456', categoria: 'Grãos', unidade: 'kg' });
  });

  it('deve aceitar produto com nome, código, categoria e preço preenchidos', () => {
    // Arrange
    const dados = pickFields(
      { nome: 'Feijão', codigo_produto: 'FEI-01', categoria: 'Grãos', preco: '8,5' },
      PRODUTO_FIELDS,
    );

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).not.toThrow();
  });

  it.each(OBRIGATORIOS)('deve exigir o campo %s', (campo) => {
    // Arrange
    const completo: Record<string, unknown> = {
      nome: 'Feijão',
      codigo_produto: 'FEI-01',
      categoria: 'Grãos',
      preco: 8.5,
    };
    delete completo[campo];
    const dados = pickFields(completo, PRODUTO_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow(`Campos obrigatórios ausentes: ${campo}`);
  });

  it('deve recusar campo obrigatório vazio', () => {
    // Arrange
    const dados = pickFields(
      { nome: '', codigo_produto: 'FEI-01', categoria: 'Grãos', preco: 8.5 },
      PRODUTO_FIELDS,
    );

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campos obrigatórios ausentes: nome');
  });

  it('deve listar todos os campos obrigatórios ausentes', () => {
    // Arrange
    const dados = pickFields({}, PRODUTO_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow('Campos obrigatórios ausentes: nome, codigo_produto, categoria, preco');
  });
});
