import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('OpenAPI documentation', () => {
  it('registers Swagger UI and documents the existing HTTP routes', async () => {
    const app = buildApp();

    try {
      await app.ready();

      const docsResponse = await app.inject({
        method: 'GET',
        url: '/docs',
      });
      const spec = app.swagger();

      expect([200, 302]).toContain(docsResponse.statusCode);
      expect(spec).toMatchObject({
        openapi: '3.0.3',
        info: {
          title: 'Dogfy Logistics API',
          version: '1.0.0',
        },
      });
      expect(spec.paths).toHaveProperty('/deliveries');
      expect(spec.paths).toHaveProperty('/deliveries/{id}/status');
      expect(spec.paths).toHaveProperty('/webhooks/tls/status');
    } finally {
      await app.close();
    }
  });
});
