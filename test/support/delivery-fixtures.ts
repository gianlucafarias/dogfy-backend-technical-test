import type { Delivery } from '../../src/domain/delivery.js';
import type { MongoDeliveryDocument } from '../../src/infrastructure/mongodb/mongo-delivery-document.js';

export function deliveryFixture(overrides: Partial<Delivery> = {}): Delivery {
  return {
    id: 'delivery-1',
    orderReference: 'DEMO-NRW-002',
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
    provider: 'NRW',
    providerDeliveryId: 'nrw_DEMO-NRW-002',
    label: {
      format: 'text',
      content: 'Printable label',
    },
    status: 'created',
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    statusUpdatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}

export function documentFixture(
  overrides: Partial<MongoDeliveryDocument> = {},
): MongoDeliveryDocument {
  return {
    _id: 'delivery-1',
    orderReference: 'DEMO-NRW-002',
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
    provider: {
      code: 'NRW',
      deliveryId: 'nrw_DEMO-NRW-002',
    },
    label: {
      format: 'text',
      content: 'Printable label',
    },
    status: 'created',
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    updatedAt: new Date('2026-07-01T10:00:00.000Z'),
    statusUpdatedAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  };
}
