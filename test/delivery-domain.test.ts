import { describe, expect, it } from 'vitest';
import {
  createDeliveryEntity,
  normalizeShipmentDetails,
  type ShipmentDetails,
} from '../src/domain/delivery.js';
import { isDeliveryStatus } from '../src/domain/delivery-status.js';
import { DomainValidationError } from '../src/domain/domain-errors.js';
import { normalizeLabel } from '../src/domain/label.js';
import { isProviderCode } from '../src/domain/provider.js';

describe('delivery domain', () => {
  it('creates a delivery in created status with defensive timestamps', () => {
    const now = new Date('2026-07-01T10:00:00.000Z');

    const delivery = createDeliveryEntity({
      ...validShipmentDetails(),
      id: 'delivery-1',
      provider: 'NRW',
      providerDeliveryId: 'nrw_DEMO-NRW-002',
      label: {
        format: 'text',
        content: 'Printable label',
      },
      now,
    });

    now.setFullYear(2030);

    expect(delivery).toMatchObject({
      id: 'delivery-1',
      orderReference: 'DEMO-NRW-002',
      provider: 'NRW',
      providerDeliveryId: 'nrw_DEMO-NRW-002',
      label: {
        format: 'text',
        content: 'Printable label',
      },
      status: 'created',
    });
    expect(delivery.createdAt).toEqual(new Date('2026-07-01T10:00:00.000Z'));
    expect(delivery.updatedAt).toEqual(new Date('2026-07-01T10:00:00.000Z'));
    expect(delivery.statusUpdatedAt).toEqual(new Date('2026-07-01T10:00:00.000Z'));
  });

  it('normalizes shipment details and trims string values', () => {
    expect(
      normalizeShipmentDetails({
        orderReference: '  DEMO-NRW-002  ',
        recipient: {
          name: '  Jane Doe  ',
          phone: '  +34123456789  ',
        },
        address: {
          line1: '  Calle Example 123  ',
          postalCode: '  08001  ',
          city: '  Barcelona  ',
          country: '  ES  ',
        },
        package: {
          weightGrams: 1200,
        },
      }),
    ).toEqual({
      orderReference: 'DEMO-NRW-002',
      recipient: {
        name: 'Jane Doe',
        phone: '+34123456789',
        email: undefined,
      },
      address: {
        line1: 'Calle Example 123',
        line2: undefined,
        postalCode: '08001',
        city: 'Barcelona',
        country: 'ES',
      },
      package: {
        weightGrams: 1200,
      },
    });
  });

  it('rejects invalid shipment details', () => {
    expect(() =>
      normalizeShipmentDetails({
        ...validShipmentDetails(),
        orderReference: '   ',
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      normalizeShipmentDetails({
        ...validShipmentDetails(),
        package: {
          weightGrams: 0,
        },
      }),
    ).toThrow(DomainValidationError);
  });

  it('rejects unsupported providers, invalid labels and invalid dates', () => {
    expect(() =>
      createDeliveryEntity({
        ...validEntityParams(),
        provider: 'DHL' as never,
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      createDeliveryEntity({
        ...validEntityParams(),
        label: {
          format: 'pdf' as never,
          content: 'Printable label',
        },
      }),
    ).toThrow(DomainValidationError);

    expect(() =>
      createDeliveryEntity({
        ...validEntityParams(),
        now: new Date('invalid-date'),
      }),
    ).toThrow(DomainValidationError);
  });

  it('validates provider, status and label value objects', () => {
    expect(isProviderCode('NRW')).toBe(true);
    expect(isProviderCode('TLS')).toBe(true);
    expect(isProviderCode('DHL')).toBe(false);

    expect(isDeliveryStatus('created')).toBe(true);
    expect(isDeliveryStatus('in_transit')).toBe(true);
    expect(isDeliveryStatus('lost')).toBe(false);

    expect(normalizeLabel({ format: 'text', content: '  Printable label  ' })).toEqual({
      format: 'text',
      content: 'Printable label',
    });
    expect(() => normalizeLabel({ format: 'text', content: '   ' })).toThrow(
      DomainValidationError,
    );
  });
});

function validShipmentDetails(): ShipmentDetails {
  return {
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
  };
}

function validEntityParams() {
  return {
    ...validShipmentDetails(),
    id: 'delivery-1',
    provider: 'NRW' as const,
    providerDeliveryId: 'nrw_DEMO-NRW-002',
    label: {
      format: 'text' as const,
      content: 'Printable label',
    },
    now: new Date('2026-07-01T10:00:00.000Z'),
  };
}
