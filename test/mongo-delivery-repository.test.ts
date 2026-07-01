import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MongoClient } from 'mongodb';
import type { Db } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoDeliveryRepository } from '../src/infrastructure/mongodb/mongo-delivery-repository.js';
import type { MongoDeliveryDocument } from '../src/infrastructure/mongodb/mongo-delivery-document.js';
import { deliveryFixture } from './support/delivery-fixtures.js';

describe('MongoDeliveryRepository', () => {
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

  it('saves and retrieves a delivery by id', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    const delivery = deliveryFixture();

    await repository.save(delivery);

    await expect(repository.findById(delivery.id)).resolves.toEqual(delivery);
  });

  it('creates the documented indexes without adding idempotency on orderReference', async () => {
    const collection = db.collection<MongoDeliveryDocument>('deliveries');
    const repository = new MongoDeliveryRepository(collection);

    await repository.ensureIndexes();

    const indexes = await collection.indexes();
    const indexNames = indexes.map((index) => index.name);

    expect(indexNames).toContain('provider_delivery_lookup');
    expect(indexNames).toContain('provider_status_lookup');
    expect(indexNames).not.toContain('orderReference_1');
  });
});
