import type { Delivery } from '../../domain/delivery.js';

export interface DeliveryRepositoryPort {
  save(delivery: Delivery): Promise<void>;
  findById(id: string): Promise<Delivery | null>;
}
