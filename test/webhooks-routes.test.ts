import { describe, expect, it } from 'vitest';
import {
  DeliveryNotFoundError,
  InvalidDeliveryInputError,
} from '../src/application/application-errors.js';
import type { HandleTlsWebhookResult } from '../src/application/handle-tls-webhook.js';
import { buildApp } from '../src/app.js';
import { buildDeliveryUseCases } from '../src/composition-root.js';

describe('POST /webhooks/tls/status', () => {
  it('accepts a TLS webhook status update', async () => {
    const app = buildApp({
      deliveryUseCases: {
        ...buildDeliveryUseCases(),
        handleTlsWebhookUseCase: {
          execute: async (): Promise<HandleTlsWebhookResult> => {
            return {
              deliveryId: 'delivery-1',
              status: 'in_transit',
              statusUpdatedAt: new Date('2026-07-01T12:00:00.000Z'),
            };
          },
        },
      },
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/tls/status',
        payload: {
          providerDeliveryId: 'tls_DEMO-TLS-001',
          status: 'IN_TRANSIT',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        deliveryId: 'delivery-1',
        status: 'in_transit',
        statusUpdatedAt: '2026-07-01T12:00:00.000Z',
      });
    } finally {
      await app.close();
    }
  });

  it('returns 404 when the TLS delivery does not exist', async () => {
    const app = buildApp({
      deliveryUseCases: {
        ...buildDeliveryUseCases(),
        handleTlsWebhookUseCase: {
          execute: async () => {
            throw new DeliveryNotFoundError('tls_missing');
          },
        },
      },
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/tls/status',
        payload: {
          providerDeliveryId: 'tls_missing',
          status: 'DELIVERED',
        },
      });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it('returns 400 when the TLS status is unknown', async () => {
    const app = buildApp({
      deliveryUseCases: {
        ...buildDeliveryUseCases(),
        handleTlsWebhookUseCase: {
          execute: async () => {
            throw new InvalidDeliveryInputError('Unsupported TLS status: LOST_IN_HUB');
          },
        },
      },
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/tls/status',
        payload: {
          providerDeliveryId: 'tls_DEMO-TLS-001',
          status: 'LOST_IN_HUB',
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it('returns 400 for invalid payloads', async () => {
    const app = buildApp();

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/tls/status',
        payload: {
          providerDeliveryId: 'tls_DEMO-TLS-001',
        },
      });

      expect(response.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });
});
