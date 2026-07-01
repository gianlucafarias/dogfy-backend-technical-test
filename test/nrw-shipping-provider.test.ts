import { describe, expect, it } from 'vitest';
import {
  mapNrwStatusToDeliveryStatus,
  NrwShippingProvider,
} from '../src/infrastructure/providers/nrw-shipping-provider.js';

describe('NrwShippingProvider polling', () => {
  it('maps NRW external statuses to internal delivery statuses', () => {
    expect(mapNrwStatusToDeliveryStatus('READY')).toBe('created');
    expect(mapNrwStatusToDeliveryStatus('ON_ROUTE')).toBe('in_transit');
    expect(mapNrwStatusToDeliveryStatus('DELIVERED')).toBe('delivered');
    expect(mapNrwStatusToDeliveryStatus('DELIVERY_FAILED')).toBe('failed');
    expect(mapNrwStatusToDeliveryStatus('MISPLACED_AT_DEPOT')).toBeNull();
  });

  it('returns a simulated status change for a created delivery', async () => {
    const provider = new NrwShippingProvider();

    await expect(
      provider.pollStatus({
        providerDeliveryId: 'nrw_DEMO-NRW-002',
        currentStatus: 'created',
      }),
    ).resolves.toEqual({
      kind: 'changed',
      externalStatus: 'ON_ROUTE',
      status: 'in_transit',
    });
  });

  it('can simulate no changes', async () => {
    const provider = new NrwShippingProvider();

    await expect(
      provider.pollStatus({
        providerDeliveryId: 'nrw_NO-CHANGE',
        currentStatus: 'created',
      }),
    ).resolves.toEqual({
      kind: 'unchanged',
    });
  });

  it('can simulate an unknown external status without normalizing it', async () => {
    const provider = new NrwShippingProvider();

    await expect(
      provider.pollStatus({
        providerDeliveryId: 'nrw_UNKNOWN',
        currentStatus: 'created',
      }),
    ).resolves.toEqual({
      kind: 'unknown-status',
      externalStatus: 'MISPLACED_AT_DEPOT',
    });
  });
});
