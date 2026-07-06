import { describe, expect, it } from 'vitest';
import { DomainValidationError } from '../src/domain/domain-errors.js';
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

  it('omits undefined optional shipment fields when mapping to Mongo', () => {
    const document = toMongoDeliveryDocument(
      deliveryFixture({
        recipient: {
          name: 'Jane Doe',
        },
        address: {
          line1: 'Calle Example 123',
          postalCode: '08001',
          city: 'Barcelona',
          country: 'ES',
        },
      }),
    );

    expect(document.recipient).toEqual({
      name: 'Jane Doe',
    });
    expect(document.address).toEqual({
      line1: 'Calle Example 123',
      postalCode: '08001',
      city: 'Barcelona',
      country: 'ES',
    });
  });

  it('maps a Mongo document back to the domain shape', () => {
    const delivery = toDelivery(documentFixture());

    expect(delivery).toEqual(deliveryFixture());
  });

  it('treats null optional shipment fields from Mongo as missing', () => {
    const delivery = toDelivery(
      documentFixture({
        recipient: {
          name: 'Jane Doe',
          phone: null as never,
          email: null as never,
        },
        address: {
          line1: 'Calle Example 123',
          line2: null as never,
          postalCode: '08001',
          city: 'Barcelona',
          country: 'ES',
        },
      }),
    );

    expect(delivery.recipient).toEqual({
      name: 'Jane Doe',
      phone: undefined,
      email: undefined,
    });
    expect(delivery.address).toEqual({
      line1: 'Calle Example 123',
      line2: undefined,
      postalCode: '08001',
      city: 'Barcelona',
      country: 'ES',
    });
  });

  it('rejects Mongo documents with unsupported provider or status values', () => {
    expect(() =>
      toDelivery(
        documentFixture({
          provider: {
            code: 'DHL' as never,
            deliveryId: 'dhl_DEMO-NRW-002',
          },
        }),
      ),
    ).toThrow(DomainValidationError);

    expect(() =>
      toDelivery(
        documentFixture({
          status: 'lost' as never,
        }),
      ),
    ).toThrow(DomainValidationError);
  });

  it('rejects Mongo documents with invalid label, provider id or timestamps', () => {
    expect(() =>
      toDelivery(
        documentFixture({
          label: {
            format: 'pdf' as never,
            content: 'Printable label',
          },
        }),
      ),
    ).toThrow(DomainValidationError);

    expect(() =>
      toDelivery(
        documentFixture({
          provider: {
            code: 'NRW',
            deliveryId: '   ',
          },
        }),
      ),
    ).toThrow(DomainValidationError);

    expect(() =>
      toDelivery(
        documentFixture({
          statusUpdatedAt: new Date('invalid-date'),
        }),
      ),
    ).toThrow(DomainValidationError);
  });
});
