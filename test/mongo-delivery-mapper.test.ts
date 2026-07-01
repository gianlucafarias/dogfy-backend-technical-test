import { describe, expect, it } from 'vitest';
import { toDelivery, toMongoDeliveryDocument } from '../src/infrastructure/mongodb/mongo-delivery-mapper.js';
import { deliveryFixture, documentFixture } from './support/delivery-fixtures.js';

describe('mongo delivery mapper', () => {
  it('maps a domain delivery to a Mongo document', () => {
    expect(toMongoDeliveryDocument(deliveryFixture())).toEqual({
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
    });
  });

  it('maps a Mongo document back to the domain shape', () => {
    const delivery = toDelivery(documentFixture());

    expect(delivery).toEqual(deliveryFixture());
  });
});
