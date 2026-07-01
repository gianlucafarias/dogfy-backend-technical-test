import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildApp } from '../src/app.js';
import { buildDeliveryUseCases } from '../src/composition-root.js';
import type { ShipmentDetails } from '../src/domain/delivery.js';
import type { MongoDeliveryDocument } from '../src/infrastructure/mongodb/mongo-delivery-document.js';
import { MongoDeliveryRepository } from '../src/infrastructure/mongodb/mongo-delivery-repository.js';

describe('NRW polling flow', () => {
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

  it('persists an NRW polling status update and exposes it through GET status', async () => {
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

      await expect(useCases.pollNrwDeliveriesUseCase.execute()).resolves.toMatchObject({
        checked: 1,
        updated: 1,
      });

      const statusResponse = await app.inject({
        method: 'GET',
        url: `/deliveries/${createdDelivery.id}/status`,
      });

      expect(createResponse.statusCode).toBe(201);
      expect(createdDelivery).toMatchObject({
        orderReference: 'DEMO-NRW-002',
        provider: 'NRW',
        status: 'created',
      });
      expect(statusResponse.statusCode).toBe(200);
      expect(statusResponse.json()).toMatchObject({
        deliveryId: createdDelivery.id,
        status: 'in_transit',
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
