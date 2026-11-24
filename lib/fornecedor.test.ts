import { pickFields, requireFields, ValidationError } from './api';
import { FORNECEDOR_FIELDS } from './fields';

const OBRIGATORIOS = ['nome'];

describe('Fornecedor', () => {
  it('deve converter valores numéricos para texto', () => {
    // Arrange
    const corpo = {
      nome: 12345,
      telefone: 11999999999,
      cpf: 12345678900,
    };

    // Act
    const resultado = pickFields(corpo, FORNECEDOR_FIELDS);

    // Assert
    expect(resultado.nome).toBe('12345');
    expect(resultado.telefone).toBe('11999999999');
    expect(resultado.cpf).toBe('12345678900');
  });

  it('deve converter todos os campos do fornecedor para texto', () => {
    // Arrange
    const corpo = {
      nome: 'João da Silva',
      telefone: '11988887777',
      area_atuacao: 'Hortifrúti',
      cpf: '123.456.789-00',
      email: 'joao@coopaf.org',
      endereco: 'Sítio Boa Vista, s/n',
      status: 'Cooperado',
      tipo_associado: 'Fundador',
    };

    // Act
    const resultado = pickFields(corpo, FORNECEDOR_FIELDS);

    // Assert
    expect(resultado).toEqual({
      nome: 'João da Silva',
      telefone: '11988887777',
      area_atuacao: 'Hortifrúti',
      cpf: '123.456.789-00',
      email: 'joao@coopaf.org',
      endereco: 'Sítio Boa Vista, s/n',
      status: 'Cooperado',
      tipo_associado: 'Fundador',
    });
  });

  it('deve ignorar campos que não pertencem ao fornecedor', () => {
    // Arrange
    const corpo = {
      nome: 'Maria da Silva',
      id: 99,
      campo_inexistente: 'invalido',
      admin: true,
      preco: 100,
      itens: [],
    };

    // Act
    const resultado = pickFields(corpo, FORNECEDOR_FIELDS);

    // Assert
    expect(resultado).toEqual({ nome: 'Maria da Silva' });
    expect(resultado).not.toHaveProperty('id');
    expect(resultado).not.toHaveProperty('campo_inexistente');
    expect(resultado).not.toHaveProperty('admin');
    expect(resultado).not.toHaveProperty('preco');
    expect(resultado).not.toHaveProperty('itens');
  });

  it('deve manter apenas os campos enviados, permitindo atualização parcial', () => {
    // Arrange
    const corpo = { telefone: '11977776666' };

    // Act
    const resultado = pickFields(corpo, FORNECEDOR_FIELDS);

    // Assert
    expect(resultado).toEqual({ telefone: '11977776666' });
  });

  it('deve aceitar fornecedor com o campo nome preenchido', () => {
    // Arrange
    const dados = pickFields({ nome: 'Cooperado ABC' }, FORNECEDOR_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).not.toThrow();
  });

  it('deve exigir o campo nome quando ele não for enviado', () => {
    // Arrange
    const dados = pickFields({ telefone: '11999999999' }, FORNECEDOR_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campos obrigatórios ausentes: nome');
  });

  it('deve recusar campo nome quando enviado vazio', () => {
    // Arrange
    const dados = pickFields({ nome: '' }, FORNECEDOR_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campos obrigatórios ausentes: nome');
  });

  it('deve recusar campo com valor nulo', () => {
    // Arrange
    const corpo = { nome: null };

    // Act
    const executar = () => pickFields(corpo, FORNECEDOR_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campo "nome" não pode ser vazio');
  });

  it.each([
    ['nulo', null],
    ['uma lista', [{ nome: 'João' }]],
    ['um texto', 'fornecedor'],
  ])('deve recusar corpo que é %s', (_caso, corpo) => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => pickFields(corpo, FORNECEDOR_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Corpo da requisição inválido');
  });
});
