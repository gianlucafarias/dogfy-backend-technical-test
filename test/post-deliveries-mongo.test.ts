import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp } from '../src/app.js';
import { buildDeliveryUseCases } from '../src/composition-root.js';
import type { ShipmentDetails } from '../src/domain/delivery.js';
import type { MongoDeliveryDocument } from '../src/infrastructure/mongodb/mongo-delivery-document.js';
import { MongoDeliveryRepository } from '../src/infrastructure/mongodb/mongo-delivery-repository.js';

describe('POST /deliveries with MongoDB persistence', () => {
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

  it('persists the created delivery in MongoDB', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    await repository.ensureIndexes();
    const useCases = buildDeliveryUseCases({ repository });
    const app = buildApp({
      createDeliveryUseCase: useCases.createDeliveryUseCase,
      getDeliveryStatusUseCase: useCases.getDeliveryStatusUseCase,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/deliveries',
        payload: validPayload('DEMO-TLS-001'),
      });
      const body = response.json();
      const persistedDelivery = await repository.findById(body.id);
      const persistedDocument = await db
        .collection<MongoDeliveryDocument>('deliveries')
        .findOne({ _id: body.id });

      expect(response.statusCode).toBe(201);
      expect(persistedDelivery).toMatchObject({
        id: body.id,
        orderReference: 'DEMO-TLS-001',
        provider: 'TLS',
        providerDeliveryId: 'tls_DEMO-TLS-001',
        status: 'created',
      });
      expect(persistedDocument).toMatchObject({
        _id: body.id,
        orderReference: 'DEMO-TLS-001',
        provider: {
          code: 'TLS',
          deliveryId: 'tls_DEMO-TLS-001',
        },
        status: 'created',
      });
    } finally {
      await app.close();
    }
  });

  it('returns status for a delivery persisted in MongoDB', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    await repository.ensureIndexes();
    const useCases = buildDeliveryUseCases({ repository });
    const app = buildApp({
      createDeliveryUseCase: useCases.createDeliveryUseCase,
      getDeliveryStatusUseCase: useCases.getDeliveryStatusUseCase,
    });

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
