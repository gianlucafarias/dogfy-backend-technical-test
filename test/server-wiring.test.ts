import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('server wiring', () => {
  it('passes the Mongo-backed delivery use cases to the HTTP app as one group', () => {
    const serverSource = readFileSync(
      new URL('../src/server.ts', import.meta.url),
      'utf8',
    );

    expect(serverSource).toContain('deliveryUseCases,');
  });
});
