import { describe, expect, it } from 'vitest';
import { PollNrwDeliveriesUseCase } from '../src/application/poll-nrw-deliveries.js';
import type { ClockPort } from '../src/application/ports/clock-port.js';
import type { DeliveryRepositoryPort } from '../src/application/ports/delivery-repository-port.js';
import type {
  PollingStatusCommand,
  PollingStatusProviderPort,
  PollingStatusProviderResult,
} from '../src/application/ports/polling-status-provider-port.js';
import { isTerminalDeliveryStatus, type DeliveryStatus } from '../src/domain/delivery-status.js';
import type { Delivery } from '../src/domain/delivery.js';
import { deliveryFixture } from './support/delivery-fixtures.js';

describe('PollNrwDeliveriesUseCase', () => {
  it('updates the latest status when NRW returns a valid change', async () => {
    const repository = new RecordingDeliveryRepository([
      deliveryFixture({
        id: 'delivery-1',
        providerDeliveryId: 'nrw_delivery_1',
        status: 'created',
      }),
    ]);
    const provider = new StubPollingProvider({
      nrw_delivery_1: {
        kind: 'changed',
        externalStatus: 'ON_ROUTE',
        status: 'in_transit',
      },
    });
    const useCase = buildUseCase(repository, provider);

    await expect(useCase.execute()).resolves.toEqual({
      checked: 1,
      updated: 1,
      unchanged: 0,
      unknownStatus: 0,
      failed: 0,
    });
    expect(repository.updates).toEqual([
      {
        id: 'delivery-1',
        status: 'in_transit',
        now: new Date('2026-07-01T11:00:00.000Z'),
      },
    ]);
    await expect(repository.findById('delivery-1')).resolves.toMatchObject({
      status: 'in_transit',
      statusUpdatedAt: new Date('2026-07-01T11:00:00.000Z'),
    });
  });

  it('does not update the delivery when NRW returns no changes', async () => {
    const originalStatusUpdatedAt = new Date('2026-07-01T10:00:00.000Z');
    const repository = new RecordingDeliveryRepository([
      deliveryFixture({
        id: 'delivery-1',
        providerDeliveryId: 'nrw_no_change',
        statusUpdatedAt: originalStatusUpdatedAt,
      }),
    ]);
    const provider = new StubPollingProvider({
      nrw_no_change: {
        kind: 'unchanged',
      },
    });
    const useCase = buildUseCase(repository, provider);

    await expect(useCase.execute()).resolves.toMatchObject({
      checked: 1,
      updated: 0,
      unchanged: 1,
    });
    expect(repository.updates).toHaveLength(0);
    await expect(repository.findById('delivery-1')).resolves.toMatchObject({
      status: 'created',
      statusUpdatedAt: originalStatusUpdatedAt,
    });
  });

  it('does not corrupt the delivery when NRW returns an unknown status', async () => {
    const repository = new RecordingDeliveryRepository([
      deliveryFixture({
        id: 'delivery-1',
        providerDeliveryId: 'nrw_unknown',
        status: 'created',
      }),
    ]);
    const provider = new StubPollingProvider({
      nrw_unknown: {
        kind: 'unknown-status',
        externalStatus: 'MISPLACED_AT_DEPOT',
      },
    });
    const useCase = buildUseCase(repository, provider);

    await expect(useCase.execute()).resolves.toEqual({
      checked: 1,
      updated: 0,
      unchanged: 0,
      unknownStatus: 1,
      failed: 0,
    });
    expect(repository.updates).toHaveLength(0);
    await expect(repository.findById('delivery-1')).resolves.toMatchObject({
      status: 'created',
    });
  });

  it('continues polling the remaining deliveries when one delivery fails', async () => {
    const repository = new RecordingDeliveryRepository([
      deliveryFixture({
        id: 'delivery-1',
        providerDeliveryId: 'nrw_poll_error',
      }),
      deliveryFixture({
        id: 'delivery-2',
        providerDeliveryId: 'nrw_delivery_2',
      }),
    ]);
    const provider = new StubPollingProvider({
      nrw_poll_error: new Error('provider down'),
      nrw_delivery_2: {
        kind: 'changed',
        externalStatus: 'ON_ROUTE',
        status: 'in_transit',
      },
    });
    const useCase = buildUseCase(repository, provider);

    await expect(useCase.execute()).resolves.toEqual({
      checked: 2,
      updated: 1,
      unchanged: 0,
      unknownStatus: 0,
      failed: 1,
    });
    expect(provider.calls.map((call) => call.providerDeliveryId)).toEqual([
      'nrw_poll_error',
      'nrw_delivery_2',
    ]);
    expect(repository.updates).toEqual([
      {
        id: 'delivery-2',
        status: 'in_transit',
        now: new Date('2026-07-01T11:00:00.000Z'),
      },
    ]);
  });
});

function buildUseCase(
  repository: DeliveryRepositoryPort,
  pollingProvider: PollingStatusProviderPort,
): PollNrwDeliveriesUseCase {
  return new PollNrwDeliveriesUseCase({
    repository,
    pollingProvider,
    clock: new FixedClock(),
  });
}

class RecordingDeliveryRepository implements DeliveryRepositoryPort {
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

  async findNrwDeliveriesPendingPolling(): Promise<Delivery[]> {
    return [...this.deliveries.values()].filter((delivery) => {
      return delivery.provider === 'NRW' && !isTerminalDeliveryStatus(delivery.status);
    });
  }

  async updateLatestStatus(id: string, status: DeliveryStatus, now: Date): Promise<void> {
    this.updates.push({ id, status, now });
    const delivery = this.deliveries.get(id);

    if (delivery === undefined) {
      return;
    }

    this.deliveries.set(id, {
      ...delivery,
      status,
      updatedAt: now,
      statusUpdatedAt: now,
    });
  }
}

class StubPollingProvider implements PollingStatusProviderPort {
  readonly calls: PollingStatusCommand[] = [];
  private readonly results: Record<string, PollingStatusProviderResult | Error>;

  constructor(results: Record<string, PollingStatusProviderResult | Error>) {
    this.results = results;
  }

  async pollStatus(command: PollingStatusCommand): Promise<PollingStatusProviderResult> {
    this.calls.push(command);
    const result = this.results[command.providerDeliveryId];

    if (result instanceof Error) {
      throw result;
    }

    return result ?? { kind: 'unchanged' };
  }
}

class FixedClock implements ClockPort {
  now(): Date {
    return new Date('2026-07-01T11:00:00.000Z');
  }
}
