import { pickFields, requireFields, ValidationError } from './api';
import { PEDIDO_FIELDS } from './fields';

describe('Pedido', () => {
  it('deve converter id_cliente de texto para inteiro', () => {
    // Arrange
    const corpo = { id_cliente: '7' };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado.id_cliente).toBe(7);
  });

  it('deve descartar a parte decimal de id_cliente', () => {
    // Arrange
    const corpo = { id_cliente: '7.9' };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado.id_cliente).toBe(7);
  });

  it('deve recusar id_cliente não numérico', () => {
    // Arrange
    const corpo = { id_cliente: 'abc' };

    // Act
    const executar = () => pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campo "id_cliente" deve ser numérico');
  });

  it('deve converter a data em texto para um objeto Date', () => {
    // Arrange
    const corpo = { data: '2026-11-23T10:00:00.000Z' };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado.data).toBeInstanceOf(Date);
    expect((resultado.data as Date).toISOString()).toBe('2026-11-23T10:00:00.000Z');
  });

  it.each([
    ['texto qualquer', 'abc'],
    ['mês e dia impossíveis', '2026-13-45'],
  ])('deve recusar data inválida (%s)', (_caso, data) => {
    // Arrange
    const corpo = { data };

    // Act
    const executar = () => pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campo "data" deve ser uma data válida');
  });

  it('deve converter desconto e preço de texto para número', () => {
    // Arrange
    const corpo = { desconto: '5', preco: '120.50' };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado.desconto).toBe(5);
    expect(resultado.preco).toBe(120.5);
  });

  it('deve aceitar vírgula como separador decimal em desconto e preço', () => {
    // Arrange
    const corpo = { desconto: '1,5', preco: '8,5' };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado.desconto).toBe(1.5);
    expect(resultado.preco).toBe(8.5);
  });

  it.each([['desconto'], ['preco']])('deve recusar %s não numérico', campo => {
    // Arrange
    const corpo = { [campo]: 'caro' };

    // Act
    const executar = () => pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow(`Campo "${campo}" deve ser numérico`);
  });

  it('deve ignorar campos que não pertencem ao pedido', () => {
    // Arrange
    const corpo = { id_cliente: 3, senha: '123', itens: [{ id_produto: 1, quantidade: 2 }] };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado).toEqual({ id_cliente: 3 });
    expect(resultado).not.toHaveProperty('senha');
    expect(resultado).not.toHaveProperty('itens');
  });

  it('deve manter só os campos enviados, permitindo atualização parcial', () => {
    // Arrange
    const corpo = { status: 'Entregue' };

    // Act
    const resultado = pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(resultado).toEqual({ status: 'Entregue' });
  });

  it('deve exigir o id_cliente para criar o pedido', () => {
    // Arrange
    const dados = pickFields({ status: 'Pendente' }, PEDIDO_FIELDS);

    // Act
    const executar = () => requireFields(dados, ['id_cliente']);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campos obrigatórios ausentes: id_cliente');
  });

  it.each([
    ['nulo', null],
    ['uma lista', [{ id_cliente: 1 }]],
    ['um texto', 'pedido'],
  ])('deve recusar corpo que é %s', (_caso, corpo) => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => pickFields(corpo, PEDIDO_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Corpo da requisição inválido');
  });
});
