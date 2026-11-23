import type { FieldSchema } from './api';

// Campos que cada rota aceita no corpo do POST/PUT. Qualquer outro campo é ignorado.

export const CLIENTE_FIELDS: FieldSchema = {
  instituicao: 'string',
  cnpj: 'string',
  telefone: 'string',
  responsavel: 'string',
  email: 'string',
  endereco: 'string',
  status: 'string',
};

export const FORNECEDOR_FIELDS: FieldSchema = {
  nome: 'string',
  telefone: 'string',
  area_atuacao: 'string',
  cpf: 'string',
  email: 'string',
  endereco: 'string',
  status: 'string',
  tipo_associado: 'string',
};

export const PRODUTO_FIELDS: FieldSchema = {
  nome: 'string',
  codigo_produto: 'string',
  categoria: 'string',
  preco: 'number',
  unidade: 'string',
};

/** Campos de Pedido (os itens são tratados à parte em lib/pedidos.ts). */
export const PEDIDO_FIELDS: FieldSchema = {
  codigo_pedido: 'string',
  id_cliente: 'int',
  status: 'string',
  data: 'date',
  desconto: 'number',
  preco: 'number',
};
