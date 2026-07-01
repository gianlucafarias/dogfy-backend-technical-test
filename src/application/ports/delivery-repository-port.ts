import type { Delivery } from '../../domain/delivery.js';
import type { DeliveryStatus } from '../../domain/delivery-status.js';
import type { ProviderCode } from '../../domain/provider.js';

export interface DeliveryRepositoryPort {
  save(delivery: Delivery): Promise<void>;
  findById(id: string): Promise<Delivery | null>;
  findByProviderDeliveryId(
    provider: ProviderCode,
    providerDeliveryId: string,
  ): Promise<Delivery | null>;
  findNrwDeliveriesPendingPolling(): Promise<Delivery[]>;
  updateLatestStatus(id: string, status: DeliveryStatus, now: Date): Promise<void>;
}
