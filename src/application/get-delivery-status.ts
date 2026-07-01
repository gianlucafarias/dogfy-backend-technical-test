import { DeliveryNotFoundError, InvalidDeliveryInputError } from './application-errors.js';
import type { DeliveryRepositoryPort } from './ports/delivery-repository-port.js';
import type { DeliveryStatus } from '../domain/delivery-status.js';

export type GetDeliveryStatusResult = {
  deliveryId: string;
  status: DeliveryStatus;
  statusUpdatedAt: Date;
};

export class GetDeliveryStatusUseCase {
  private readonly repository: DeliveryRepositoryPort;

  constructor(repository: DeliveryRepositoryPort) {
    this.repository = repository;
  }

  async execute(deliveryId: string): Promise<GetDeliveryStatusResult> {
    const normalizedDeliveryId = deliveryId.trim();

    if (normalizedDeliveryId.length === 0) {
      throw new InvalidDeliveryInputError('deliveryId must not be empty');
    }

    const delivery = await this.repository.findById(normalizedDeliveryId);

    if (delivery === null) {
      throw new DeliveryNotFoundError(normalizedDeliveryId);
    }

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      statusUpdatedAt: delivery.statusUpdatedAt,
    };
  }
}
