import type { DeliveryRepositoryPort } from '../../application/ports/delivery-repository-port.js';
import type { DeliveryStatus } from '../../domain/delivery-status.js';
import { isTerminalDeliveryStatus } from '../../domain/delivery-status.js';
import type { Delivery } from '../../domain/delivery.js';

export class InMemoryDeliveryRepository implements DeliveryRepositoryPort {
  private readonly deliveries = new Map<string, Delivery>();

  async save(delivery: Delivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.get(id) ?? null;
  }

  async findNrwDeliveriesPendingPolling(): Promise<Delivery[]> {
    return [...this.deliveries.values()].filter((delivery) => {
      return delivery.provider === 'NRW' && !isTerminalDeliveryStatus(delivery.status);
    });
  }

  async updateLatestStatus(id: string, status: DeliveryStatus, now: Date): Promise<void> {
    const delivery = this.deliveries.get(id);

    if (delivery === undefined) {
      return;
    }

    this.deliveries.set(id, {
      ...delivery,
      status,
      updatedAt: new Date(now),
      statusUpdatedAt: new Date(now),
    });
  }
}
