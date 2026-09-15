export class FakeRedis {
  private values = new Map<string, string>();
  get(key: string): string | undefined { return this.values.get(key); }
  set(key: string, value: string): void { this.values.set(key, value); }
}

export function fakeNestResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}
