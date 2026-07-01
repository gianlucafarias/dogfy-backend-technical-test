import { describe, expect, it } from 'vitest';
import { mapTlsStatusToDeliveryStatus } from '../src/infrastructure/providers/tls-status-mapper.js';

describe('mapTlsStatusToDeliveryStatus', () => {
  it('maps TLS external statuses to internal delivery statuses', () => {
    expect(mapTlsStatusToDeliveryStatus('READY')).toBe('created');
    expect(mapTlsStatusToDeliveryStatus('IN_TRANSIT')).toBe('in_transit');
    expect(mapTlsStatusToDeliveryStatus('DELIVERED')).toBe('delivered');
    expect(mapTlsStatusToDeliveryStatus('FAILED')).toBe('failed');
  });

  it('returns null for unknown TLS statuses', () => {
    expect(mapTlsStatusToDeliveryStatus('LOST_IN_HUB')).toBeNull();
  });
});
