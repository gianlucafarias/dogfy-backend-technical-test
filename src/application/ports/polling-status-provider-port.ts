import type { DeliveryStatus } from '../../domain/delivery-status.js';

export type PollingStatusCommand = {
  providerDeliveryId: string;
  currentStatus: DeliveryStatus;
};

export type PollingStatusProviderResult =
  | {
      kind: 'changed';
      externalStatus: string;
      status: DeliveryStatus;
    }
  | {
      kind: 'unchanged';
    }
  | {
      kind: 'unknown-status';
      externalStatus: string;
    };

export interface PollingStatusProviderPort {
  pollStatus(command: PollingStatusCommand): Promise<PollingStatusProviderResult>;
}
