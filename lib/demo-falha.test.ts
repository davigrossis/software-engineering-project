import { pickFields } from './api';
import { PRODUTO_FIELDS } from './fields';

// DEMONSTRAÇÃO (PR que não deve ser mergeado): teste com expectativa errada de propósito,
// para mostrar o CI barrando o merge quando um teste falha.
describe('Demonstração de falha no CI', () => {
  it('deve converter o preço "8,5" para 85 (expectativa errada de propósito)', () => {
    // Arrange
    const corpo = { preco: '8,5' };

    // Act
    const dados = pickFields(corpo, PRODUTO_FIELDS);

    // Assert
    expect(dados.preco).toBe(85);
  });
});
