import { parseId, pickFields, requireFields, ValidationError } from './api';
import { CLIENTE_FIELDS } from './fields';

const OBRIGATORIOS = ['instituicao', 'cnpj', 'telefone', 'responsavel'];

const CLIENTE_VALIDO = {
  instituicao: 'Escola Municipal Esperança',
  cnpj: '12.345.678/0001-90',
  telefone: '(11) 98765-4321',
  responsavel: 'Maria Souza',
};

describe('Cliente', () => {
  it('deve aceitar um cliente com instituição, CNPJ, telefone e responsável', () => {
    // Arrange
    const dados = pickFields(CLIENTE_VALIDO, CLIENTE_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).not.toThrow();
  });

  it.each(OBRIGATORIOS)('deve exigir o campo %s', campo => {
    // Arrange
    const corpo: Record<string, string> = { ...CLIENTE_VALIDO };
    delete corpo[campo];
    const dados = pickFields(corpo, CLIENTE_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow(`Campos obrigatórios ausentes: ${campo}`);
  });

  it('deve tratar campo obrigatório vazio como ausente', () => {
    // Arrange
    const dados = pickFields({ ...CLIENTE_VALIDO, responsavel: '' }, CLIENTE_FIELDS);

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow('Campos obrigatórios ausentes: responsavel');
  });

  it('deve listar todos os campos ausentes na mensagem de erro', () => {
    // Arrange
    const dados = pickFields(
      { instituicao: CLIENTE_VALIDO.instituicao, responsavel: CLIENTE_VALIDO.responsavel },
      CLIENTE_FIELDS
    );

    // Act
    const executar = () => requireFields(dados, OBRIGATORIOS);

    // Assert
    expect(executar).toThrow('Campos obrigatórios ausentes: cnpj, telefone');
    expect(executar).not.toThrow(/instituicao|responsavel/);
  });

  it('deve ignorar campos desconhecidos', () => {
    // Arrange
    const corpo = { ...CLIENTE_VALIDO, id: 99, admin: true };

    // Act
    const dados = pickFields(corpo, CLIENTE_FIELDS);

    // Assert
    expect(dados).toEqual(CLIENTE_VALIDO);
    expect(dados).not.toHaveProperty('id');
    expect(dados).not.toHaveProperty('admin');
  });

  it('deve converter os valores dos campos para texto', () => {
    // Arrange
    const corpo = { cnpj: 12345678000190, telefone: 11987654321 };

    // Act
    const dados = pickFields(corpo, CLIENTE_FIELDS);

    // Assert
    expect(dados).toEqual({ cnpj: '12345678000190', telefone: '11987654321' });
  });

  it('deve recusar campo de texto nulo', () => {
    // Arrange
    const corpo = { ...CLIENTE_VALIDO, instituicao: null };

    // Act
    const executar = () => pickFields(corpo, CLIENTE_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Campo "instituicao" não pode ser vazio');
  });

  it('deve ignorar campos ausentes para permitir atualização parcial', () => {
    // Arrange
    const corpo = { telefone: '(11) 3333-4444' };

    // Act
    const dados = pickFields(corpo, CLIENTE_FIELDS);

    // Assert
    expect(dados).toEqual({ telefone: '(11) 3333-4444' });
    expect(Object.keys(dados)).toHaveLength(1);
  });

  it.each([
    ['nulo', null],
    ['texto', 'cliente'],
    ['lista', [CLIENTE_VALIDO]],
    ['número', 42],
  ])('deve recusar corpo que não é objeto (%s)', (_caso, corpo) => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => pickFields(corpo, CLIENTE_FIELDS);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('Corpo da requisição inválido');
  });

  it('deve converter um id válido em número', () => {
    // Arrange
    const id = '5';

    // Act
    const resultado = parseId(id);

    // Assert
    expect(resultado).toBe(5);
  });

  it.each(['abc', '0', '-1', '1.5'])('deve recusar o id "%s"', id => {
    // Arrange (feito pelo it.each)

    // Act
    const executar = () => parseId(id);

    // Assert
    expect(executar).toThrow(ValidationError);
    expect(executar).toThrow('ID inválido');
  });
});
