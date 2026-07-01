import type { DeliveryRepositoryPort } from '../../application/ports/delivery-repository-port.js';
import type { Delivery } from '../../domain/delivery.js';

export class InMemoryDeliveryRepository implements DeliveryRepositoryPort {
  private readonly deliveries = new Map<string, Delivery>();

  async save(delivery: Delivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.get(id) ?? null;
  }
}
