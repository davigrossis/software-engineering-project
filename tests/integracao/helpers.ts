export const requisicao = (metodo: string, corpo?: unknown) =>
  new Request('http://teste/api', { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });

export const params = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
