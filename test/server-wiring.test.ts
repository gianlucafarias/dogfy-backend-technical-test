import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('server wiring', () => {
  it('passes the Mongo-backed TLS webhook use case to the HTTP app', () => {
    const serverSource = readFileSync(
      new URL('../src/server.ts', import.meta.url),
      'utf8',
    );

    expect(serverSource).toContain(
      'handleTlsWebhookUseCase: deliveryUseCases.handleTlsWebhookUseCase',
    );
  });
});
