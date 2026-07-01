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

  it('finds NRW deliveries that are not terminal', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );

    await repository.save(
      deliveryFixture({
        id: 'nrw-created',
        provider: 'NRW',
        status: 'created',
      }),
    );
    await repository.save(
      deliveryFixture({
        id: 'nrw-in-transit',
        provider: 'NRW',
        status: 'in_transit',
      }),
    );
    await repository.save(
      deliveryFixture({
        id: 'nrw-delivered',
        provider: 'NRW',
        status: 'delivered',
      }),
    );
    await repository.save(
      deliveryFixture({
        id: 'tls-created',
        provider: 'TLS',
        status: 'created',
      }),
    );

    const deliveries = await repository.findNrwDeliveriesPendingPolling();

    expect(deliveries.map((delivery) => delivery.id).sort()).toEqual([
      'nrw-created',
      'nrw-in-transit',
    ]);
  });

  it('finds a delivery by provider and provider delivery id', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    const tlsDelivery = deliveryFixture({
      id: 'tls-delivery',
      provider: 'TLS',
      providerDeliveryId: 'tls_DEMO-TLS-001',
    });
    const nrwDelivery = deliveryFixture({
      id: 'nrw-delivery',
      provider: 'NRW',
      providerDeliveryId: 'tls_DEMO-TLS-001',
    });

    await repository.save(tlsDelivery);
    await repository.save(nrwDelivery);

    await expect(
      repository.findByProviderDeliveryId('TLS', 'tls_DEMO-TLS-001'),
    ).resolves.toEqual(tlsDelivery);
    await expect(
      repository.findByProviderDeliveryId('TLS', 'missing-provider-id'),
    ).resolves.toBeNull();
  });

  it('updates only the latest known status timestamps', async () => {
    const repository = new MongoDeliveryRepository(
      db.collection<MongoDeliveryDocument>('deliveries'),
    );
    const delivery = deliveryFixture({
      id: 'delivery-1',
      status: 'created',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T10:00:00.000Z'),
      statusUpdatedAt: new Date('2026-07-01T10:00:00.000Z'),
    });

    await repository.save(delivery);
    await repository.updateLatestStatus(
      delivery.id,
      'in_transit',
      new Date('2026-07-01T11:00:00.000Z'),
    );

    await expect(repository.findById(delivery.id)).resolves.toMatchObject({
      id: delivery.id,
      status: 'in_transit',
      createdAt: new Date('2026-07-01T10:00:00.000Z'),
      updatedAt: new Date('2026-07-01T11:00:00.000Z'),
      statusUpdatedAt: new Date('2026-07-01T11:00:00.000Z'),
    });
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
