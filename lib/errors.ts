/** Extrai a mensagem de um erro desconhecido (útil em blocos catch sem `any`). */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
