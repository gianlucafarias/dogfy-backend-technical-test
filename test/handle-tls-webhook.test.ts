import { describe, expect, it } from 'vitest';
import {
  DeliveryNotFoundError,
  InvalidDeliveryInputError,
} from '../src/application/application-errors.js';
import { HandleTlsWebhookUseCase } from '../src/application/handle-tls-webhook.js';
import type { ClockPort } from '../src/application/ports/clock-port.js';
import type { DeliveryRepositoryPort } from '../src/application/ports/delivery-repository-port.js';
import type { DeliveryStatus } from '../src/domain/delivery-status.js';
import type { Delivery } from '../src/domain/delivery.js';
import type { ProviderCode } from '../src/domain/provider.js';
import { deliveryFixture } from './support/delivery-fixtures.js';

describe('HandleTlsWebhookUseCase', () => {
  it('updates a TLS delivery with a known external status', async () => {
    const repository = new RecordingDeliveryRepository([
      deliveryFixture({
        id: 'delivery-1',
        provider: 'TLS',
        providerDeliveryId: 'tls_DEMO-TLS-001',
        status: 'created',
      }),
    ]);
    const useCase = buildUseCase(repository);

    await expect(
      useCase.execute({
        providerDeliveryId: 'tls_DEMO-TLS-001',
        status: 'IN_TRANSIT',
      }),
    ).resolves.toEqual({
      deliveryId: 'delivery-1',
      status: 'in_transit',
      statusUpdatedAt: new Date('2026-07-01T12:00:00.000Z'),
    });
    expect(repository.providerLookups).toEqual([
      {
        provider: 'TLS',
        providerDeliveryId: 'tls_DEMO-TLS-001',
      },
    ]);
    expect(repository.updates).toEqual([
      {
        id: 'delivery-1',
        status: 'in_transit',
        now: new Date('2026-07-01T12:00:00.000Z'),
      },
    ]);
  });

  it('fails when the TLS delivery does not exist', async () => {
    const repository = new RecordingDeliveryRepository([]);
    const useCase = buildUseCase(repository);

    await expect(
      useCase.execute({
        providerDeliveryId: 'tls_missing',
        status: 'DELIVERED',
      }),
    ).rejects.toBeInstanceOf(DeliveryNotFoundError);
    expect(repository.updates).toHaveLength(0);
  });

  it('rejects unknown TLS statuses without modifying the delivery', async () => {
    const repository = new RecordingDeliveryRepository([
      deliveryFixture({
        provider: 'TLS',
        providerDeliveryId: 'tls_DEMO-TLS-001',
      }),
    ]);
    const useCase = buildUseCase(repository);

    await expect(
      useCase.execute({
        providerDeliveryId: 'tls_DEMO-TLS-001',
        status: 'LOST_IN_HUB',
      }),
    ).rejects.toBeInstanceOf(InvalidDeliveryInputError);
    expect(repository.providerLookups).toHaveLength(0);
    expect(repository.updates).toHaveLength(0);
  });

  it('rejects invalid payloads before touching the repository', async () => {
    const repository = new RecordingDeliveryRepository([]);
    const useCase = buildUseCase(repository);

    await expect(
      useCase.execute({
        providerDeliveryId: '   ',
        status: 'DELIVERED',
      }),
    ).rejects.toBeInstanceOf(InvalidDeliveryInputError);
    expect(repository.providerLookups).toHaveLength(0);
  });
});

function buildUseCase(repository: DeliveryRepositoryPort): HandleTlsWebhookUseCase {
  return new HandleTlsWebhookUseCase({
    repository,
    mapStatus: mapTlsStatus,
    clock: new FixedClock(),
  });
}

function mapTlsStatus(status: string): DeliveryStatus | null {
  const statuses: Record<string, DeliveryStatus> = {
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    FAILED: 'failed',
  };

  return statuses[status] ?? null;
}

class RecordingDeliveryRepository implements DeliveryRepositoryPort {
  readonly providerLookups: Array<{
    provider: ProviderCode;
    providerDeliveryId: string;
  }> = [];
  readonly updates: Array<{ id: string; status: DeliveryStatus; now: Date }> = [];
  private readonly deliveries: Map<string, Delivery>;

  constructor(deliveries: Delivery[]) {
    this.deliveries = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
  }

  async save(delivery: Delivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.deliveries.get(id) ?? null;
  }

  async findByProviderDeliveryId(
    provider: ProviderCode,
    providerDeliveryId: string,
  ): Promise<Delivery | null> {
    this.providerLookups.push({ provider, providerDeliveryId });

    return (
      [...this.deliveries.values()].find((delivery) => {
        return (
          delivery.provider === provider &&
          delivery.providerDeliveryId === providerDeliveryId
        );
      }) ?? null
    );
  }

  async findNrwDeliveriesPendingPolling(): Promise<Delivery[]> {
    return [];
  }

  async updateLatestStatus(id: string, status: DeliveryStatus, now: Date): Promise<void> {
    this.updates.push({ id, status, now });
  }
}

class FixedClock implements ClockPort {
  now(): Date {
    return new Date('2026-07-01T12:00:00.000Z');
  }
}
