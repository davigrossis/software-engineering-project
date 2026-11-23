import { NextResponse } from 'next/server';

export type FieldType = 'string' | 'optionalString' | 'number' | 'int' | 'date';
export type FieldSchema = Record<string, FieldType>;
type FieldValue = string | number | Date | null;

export class ValidationError extends Error {}

function convert(name: string, type: FieldType, value: unknown): FieldValue {
  switch (type) {
    case 'string':
      if (value === null) throw new ValidationError(`Campo "${name}" não pode ser vazio`);
      return String(value);
    case 'optionalString':
      return value === null || value === '' ? null : String(value);
    case 'number':
    case 'int': {
      const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
      if (!Number.isFinite(n)) throw new ValidationError(`Campo "${name}" deve ser numérico`);
      return type === 'int' ? Math.trunc(n) : n;
    }
    case 'date': {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) throw new ValidationError(`Campo "${name}" deve ser uma data válida`);
      return d;
    }
  }
}

/**
 * Mantém apenas os campos listados em `schema`, convertendo cada valor para o tipo
 * esperado. Campos ausentes (undefined) são ignorados, o que permite atualizações parciais.
 */
export function pickFields(body: unknown, schema: FieldSchema): Record<string, FieldValue> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ValidationError('Corpo da requisição inválido');
  }
  const source = body as Record<string, unknown>;
  const result: Record<string, FieldValue> = {};
  for (const [name, type] of Object.entries(schema)) {
    if (source[name] !== undefined) result[name] = convert(name, type, source[name]);
  }
  return result;
}

/** Exige que os campos listados estejam presentes no objeto já filtrado. */
export function requireFields(data: Record<string, unknown>, fields: string[]) {
  const missing = fields.filter(f => data[f] === undefined || data[f] === '');
  if (missing.length > 0) {
    throw new ValidationError(`Campos obrigatórios ausentes: ${missing.join(', ')}`);
  }
}

export function parseId(id: string): number {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError('ID inválido');
  return n;
}

export function prismaErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/**
 * Converte erros conhecidos em respostas HTTP:
 * validação -> 400, P2025 (não encontrado) -> 404, P2002 (único) e P2003 (FK) -> 409.
 */
export function handleError(error: unknown, context: string, notFoundMessage = 'Registro não encontrado') {
  if (error instanceof ValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const code = prismaErrorCode(error);
  if (code === 'P2025') {
    return NextResponse.json({ error: notFoundMessage }, { status: 404 });
  }
  if (code === 'P2002') {
    return NextResponse.json({ error: 'Já existe um registro com esses dados' }, { status: 409 });
  }
  if (code === 'P2003') {
    return NextResponse.json(
      { error: 'Operação não permitida: o registro está vinculado a outros dados' },
      { status: 409 }
    );
  }
  console.error(`${context}:`, error);
  return NextResponse.json({ error: context }, { status: 500 });
}
