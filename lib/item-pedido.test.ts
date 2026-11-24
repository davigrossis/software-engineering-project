import { ValidationError } from './api';
import { parseItens } from './pedidos';

describe('ItemPedido', () => {
  it.each([
    ['um texto', 'texto'],
    ['null', null],
    ['undefined', undefined],
    ['um objeto avulso', { id_produto: 1, quantidade: 1 }],
    ['um número', 42],
  ])('deve recusar itens que não são uma lista (%s)', (_caso, itens) => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => parseItens(itens);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campo "itens" deve ser uma lista');
  });

  it.each([
    ['texto', { id_produto: 'abc', quantidade: 1 }],
    ['decimal', { id_produto: 1.5, quantidade: 1 }],
    ['zero', { id_produto: 0, quantidade: 1 }],
    ['negativo', { id_produto: -1, quantidade: 1 }],
    ['ausente', { quantidade: 1 }],
  ])('deve recusar item com id_produto inválido (%s)', (_caso, item) => {
    // Arrange
    const itens = [item];

    // Act
    const executar = () => parseItens(itens);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Item com produto inválido');
  });

  it.each([
    ['zero', { id_produto: 1, quantidade: 0 }],
    ['negativa', { id_produto: 1, quantidade: -2 }],
    ['texto', { id_produto: 1, quantidade: 'abc' }],
    ['ausente', { id_produto: 1 }],
  ])('deve recusar item com quantidade inválida (%s)', (_caso, item) => {
    // Arrange
    const itens = [item];

    // Act
    const executar = () => parseItens(itens);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('A quantidade de cada item deve ser maior que zero');
  });

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

  it('deve manter separados produtos diferentes ao agrupar', () => {
    // Arrange
    const itens = [
      { id_produto: 1, quantidade: 2 },
      { id_produto: 2, quantidade: 1 },
      { id_produto: 1, quantidade: 4 },
    ];

    // Act
    const resultado = parseItens(itens);

    // Assert
    expect(resultado).toEqual([
      { id_produto: 1, quantidade: 6 },
      { id_produto: 2, quantidade: 1 },
    ]);
  });

  it('deve recusar a lista inteira se um dos itens for inválido', () => {
    // Arrange
    const itens = [
      { id_produto: 1, quantidade: 2 },
      { id_produto: 2, quantidade: 0 },
    ];

    // Act
    const executar = () => parseItens(itens);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('A quantidade de cada item deve ser maior que zero');
  });

  it('deve converter números enviados como texto', () => {
    // Arrange
    const itens = [{ id_produto: '3', quantidade: '2' }];

    // Act
    const resultado = parseItens(itens);

    // Assert
    expect(resultado).toEqual([{ id_produto: 3, quantidade: 2 }]);
  });

  it('deve retornar lista vazia quando não há itens', () => {
    // Arrange
    const itens: unknown[] = [];

    // Act
    const resultado = parseItens(itens);

    // Assert
    expect(resultado).toEqual([]);
  });
});
