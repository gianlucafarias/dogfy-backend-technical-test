import type { DeliveryStatus } from '../../domain/delivery-status.js';

const tlsStatusMap: Record<string, DeliveryStatus> = {
  READY: 'created',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  FAILED: 'failed',
};

export function mapTlsStatusToDeliveryStatus(status: string): DeliveryStatus | null {
  return tlsStatusMap[status] ?? null;
}
