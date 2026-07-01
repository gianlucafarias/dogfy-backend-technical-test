import type { DeliveryStatus } from '../../domain/delivery-status.js';
import type { ShipmentDetails } from '../../domain/delivery.js';
import type {
  PollingStatusCommand,
  PollingStatusProviderPort,
  PollingStatusProviderResult,
} from '../../application/ports/polling-status-provider-port.js';
import type {
  CreateProviderDeliveryResult,
  ShippingProviderPort,
} from '../../application/ports/shipping-provider-port.js';
import { buildProviderDeliveryId, buildTextLabel } from './provider-label.js';

const nrwStatusMap: Record<string, DeliveryStatus> = {
  READY: 'created',
  ON_ROUTE: 'in_transit',
  DELIVERED: 'delivered',
  DELIVERY_FAILED: 'failed',
};

export class NrwShippingProvider implements ShippingProviderPort, PollingStatusProviderPort {
  async createDelivery(command: ShipmentDetails): Promise<CreateProviderDeliveryResult> {
    return {
      providerDeliveryId: buildProviderDeliveryId('nrw', command.orderReference),
      label: {
        format: 'text',
        content: buildTextLabel('NRW', command),
      },
      initialStatus: 'created',
    };
  }

  async pollStatus(command: PollingStatusCommand): Promise<PollingStatusProviderResult> {
    const normalizedProviderDeliveryId = command.providerDeliveryId.toUpperCase();

    if (normalizedProviderDeliveryId.includes('POLL-ERROR')) {
      throw new Error('NRW polling failed');
    }

    if (normalizedProviderDeliveryId.includes('NO-CHANGE')) {
      return {
        kind: 'unchanged',
      };
    }

    if (normalizedProviderDeliveryId.includes('UNKNOWN')) {
      return toPollingResult('MISPLACED_AT_DEPOT');
    }

    if (command.currentStatus === 'created') {
      return toPollingResult('ON_ROUTE');
    }

    if (command.currentStatus === 'in_transit') {
      return toPollingResult('DELIVERED');
    }

    return {
      kind: 'unchanged',
    };
  }
}

export function mapNrwStatusToDeliveryStatus(status: string): DeliveryStatus | null {
  return nrwStatusMap[status] ?? null;
}

function toPollingResult(externalStatus: string): PollingStatusProviderResult {
  const status = mapNrwStatusToDeliveryStatus(externalStatus);

  if (status === null) {
    return {
      kind: 'unknown-status',
      externalStatus,
    };
  }

  return {
    kind: 'changed',
    externalStatus,
    status,
  };
}
