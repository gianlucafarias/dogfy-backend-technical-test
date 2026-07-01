import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp } from '../src/app.js';
import { buildDeliveryUseCases } from '../src/composition-root.js';
import type { ShipmentDetails } from '../src/domain/delivery.js';
import type { MongoDeliveryDocument } from '../src/infrastructure/mongodb/mongo-delivery-document.js';
import { MongoDeliveryRepository } from '../src/infrastructure/mongodb/mongo-delivery-repository.js';

describe('TLS webhook flow', () => {
  let server: MongoMemoryServer;
  let client: MongoClient;
  let db: Db;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    client = new MongoClient(server.getUri());
    await client.connect();
    db = client.db('dogfy-logistics-test');
  });

  beforeEach(async () => {
    await db.dropDatabase();
  });

  afterAll(async () => {
    await client.close();
    await server.stop();
  });

  it('persists a TLS webhook status update and exposes it through GET status', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    await repository.ensureIndexes();
    const useCases = buildDeliveryUseCases({ repository });
    const app = buildApp({
      createDeliveryUseCase: useCases.createDeliveryUseCase,
      getDeliveryStatusUseCase: useCases.getDeliveryStatusUseCase,
      handleTlsWebhookUseCase: useCases.handleTlsWebhookUseCase,
    });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-TLS-001'),
      });
      const createdDelivery = createResponse.json();

      const webhookResponse = await app.inject({
        method: 'POST',
        url: '/webhooks/tls/status',
        payload: {
          providerDeliveryId: createdDelivery.providerDeliveryId,
          status: 'DELIVERED',
        },
      });
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/deliveries/${createdDelivery.id}/status`,
      });

      expect(createResponse.statusCode).toBe(201);
      expect(createdDelivery).toMatchObject({
        orderReference: 'DEMO-TLS-001',
        provider: 'TLS',
        status: 'created',
      });
      expect(webhookResponse.statusCode).toBe(200);
      expect(webhookResponse.json()).toMatchObject({
        deliveryId: createdDelivery.id,
        status: 'delivered',
      });
      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toMatchObject({
        deliveryId: createdDelivery.id,
        status: 'delivered',
      });
    } finally {
      await app.close();
    }
  });

  it('rejects unknown TLS statuses without modifying the delivery', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    await repository.ensureIndexes();
    const useCases = buildDeliveryUseCases({ repository });
    const app = buildApp({
      createDeliveryUseCase: useCases.createDeliveryUseCase,
      getDeliveryStatusUseCase: useCases.getDeliveryStatusUseCase,
      handleTlsWebhookUseCase: useCases.handleTlsWebhookUseCase,
    });

    try {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-TLS-001'),
      });
      const createdDelivery = createResponse.json();

      const webhookResponse = await app.inject({
        method: 'POST',
        url: '/webhooks/tls/status',
        payload: {
          providerDeliveryId: createdDelivery.providerDeliveryId,
          status: 'LOST_IN_HUB',
        },
      });
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/deliveries/${createdDelivery.id}/status`,
      });

      expect(webhookResponse.statusCode).toBe(400);
      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toEqual({
        deliveryId: createdDelivery.id,
        status: 'created',
        statusUpdatedAt: createdDelivery.statusUpdatedAt,
      });
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
