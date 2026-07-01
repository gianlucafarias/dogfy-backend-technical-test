import { describe, expect, it } from 'vitest';
import {
  DeliveryNotFoundError,
  InvalidDeliveryInputError,
} from '../src/application/application-errors.js';
import { GetDeliveryStatusUseCase } from '../src/application/get-delivery-status.js';
import type { DeliveryRepositoryPort } from '../src/application/ports/delivery-repository-port.js';
import type { Delivery } from '../src/domain/delivery.js';
import { deliveryFixture } from './support/delivery-fixtures.js';

describe('GetDeliveryStatusUseCase', () => {
  it('returns the latest status from the repository', async () => {
    const delivery = deliveryFixture({
      id: 'delivery-123',
      status: 'created',
      statusUpdatedAt: new Date('2026-07-01T10:00:00.000Z'),
    });
    const repository = new RecordingDeliveryRepository([delivery]);
    const useCase = new GetDeliveryStatusUseCase(repository);

    await expect(useCase.execute('delivery-123')).resolves.toEqual({
      deliveryId: 'delivery-123',
      status: 'created',
      statusUpdatedAt: new Date('2026-07-01T10:00:00.000Z'),
    });
    expect(repository.requestedIds).toEqual(['delivery-123']);
  });

  it('trims the delivery id before searching', async () => {
    const delivery = deliveryFixture({ id: 'delivery-123' });
    const repository = new RecordingDeliveryRepository([delivery]);
    const useCase = new GetDeliveryStatusUseCase(repository);

    await useCase.execute('  delivery-123  ');

    expect(repository.requestedIds).toEqual(['delivery-123']);
  });

  it('rejects an empty delivery id', async () => {
    const repository = new RecordingDeliveryRepository([]);
    const useCase = new GetDeliveryStatusUseCase(repository);

    await expect(useCase.execute('   ')).rejects.toBeInstanceOf(InvalidDeliveryInputError);
    expect(repository.requestedIds).toHaveLength(0);
  });

  it('fails when the delivery does not exist', async () => {
    const repository = new RecordingDeliveryRepository([]);
    const useCase = new GetDeliveryStatusUseCase(repository);

    await expect(useCase.execute('missing-delivery')).rejects.toBeInstanceOf(
      DeliveryNotFoundError,
    );
    expect(repository.requestedIds).toEqual(['missing-delivery']);
  });
});

class RecordingDeliveryRepository implements DeliveryRepositoryPort {
  readonly requestedIds: string[] = [];
  private readonly deliveries: Map<string, Delivery>;

  constructor(deliveries: Delivery[]) {
    this.deliveries = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
  }

  async save(delivery: Delivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    this.requestedIds.push(id);

    return this.deliveries.get(id) ?? null;
  }
}
