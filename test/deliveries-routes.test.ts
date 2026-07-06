import { describe, expect, it } from 'vitest';
import {
  NoShippingProvidersAvailableError,
  ShippingProviderCreationError,
} from '../src/application/application-errors.js';
import { buildApp } from '../src/app.js';
import { buildDeliveryUseCases } from '../src/composition-root.js';
import type { ShipmentDetails } from '../src/domain/delivery.js';

describe('POST /deliveries', () => {
  it('creates an NRW delivery and returns a printable label', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-NRW-002'),
      });
      const body = response.json();

      expect(response.statusCode).toBe(201);
      expect(body).toMatchObject({
        orderReference: 'DEMO-NRW-002',
        provider: 'NRW',
        status: 'created',
        label: {
          format: 'text',
        },
      });
      expect(body.id).toEqual(expect.any(String));
      expect(body.providerDeliveryId).toMatch(/^nrw_DEMO-NRW-002_[0-9a-f-]{36}$/);
      expect(body.label.content).toContain('NRW SHIPPING LABEL');
      expect(body.createdAt).toEqual(expect.any(String));
    } finally {
      await app.close();
    }
  });

  it('creates a TLS delivery using the documented order reference', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-TLS-001'),
      });
      const body = response.json();

      expect(response.statusCode).toBe(201);
      expect(body.provider).toBe('TLS');
      expect(body.providerDeliveryId).toMatch(/^tls_DEMO-TLS-001_[0-9a-f-]{36}$/);
      expect(body.label.content).toContain('TLS SHIPPING LABEL');
      expect(body.status).toBe('created');
    } finally {
      await app.close();
    }
  });

  it('rejects invalid requests', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: {
          ...validPayload('DEMO-NRW-002'),
          recipient: undefined,
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('does not allow the consumer to choose the provider', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: {
          ...validPayload('DEMO-NRW-002'),
          provider: 'TLS',
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('maps unavailable providers to 503', async () => {
    const app = buildApp({
      deliveryUseCases: {
        ...buildDeliveryUseCases(),
        createDeliveryUseCase: {
          execute: async () => {
            throw new NoShippingProvidersAvailableError();
          },
        },
      },
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-NRW-002'),
      });

      expect(response.statusCode).toBe(503);
    } finally {
      await app.close();
    }
  });

  it('maps provider creation failures to 502', async () => {
    const app = buildApp({
      deliveryUseCases: {
        ...buildDeliveryUseCases(),
        createDeliveryUseCase: {
          execute: async () => {
            throw new ShippingProviderCreationError();
          },
        },
      },
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-NRW-002'),
      });

      expect(response.statusCode).toBe(502);
    } finally {
      await app.close();
    }
  });
});

describe('GET /deliveries/:id/status', () => {
  it('returns the latest persisted status for a created delivery', async () => {
    const app = buildApp();

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-NRW-002'),
      });
      const createdDelivery = createResponse.json();
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/deliveries/${createdDelivery.id}/status`,
      });
      const statusBody = statusResponse.json();

      expect(statusResponse.statusCode).toBe(200);
      expect(statusBody).toEqual({
        deliveryId: createdDelivery.id,
        status: 'created',
        statusUpdatedAt: createdDelivery.statusUpdatedAt,
      });
    } finally {
      await app.close();
    }
  });

  it('returns 404 when the delivery does not exist', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/deliveries/missing-delivery/status',
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it('returns 400 when the delivery id is blank', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'GET',
        url: '/deliveries/%20/status',
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});

function validPayload(orderReference: string): ShipmentDetails {
  return {
    orderReference,
    recipient: {
      name: 'Jane Doe',
      phone: '+34123456789',
      email: 'jane@example.com',
    },
    address: {
      line1: 'Calle Example 123',
      line2: '2A',
      postalCode: '08001',
      city: 'Barcelona',
      country: 'ES',
    },
    package: {
      weightGrams: 1200,
    },
  };
}
