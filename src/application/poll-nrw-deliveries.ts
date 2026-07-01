import type { ClockPort } from './ports/clock-port.js';
import type { DeliveryRepositoryPort } from './ports/delivery-repository-port.js';
import type { PollingStatusProviderPort } from './ports/polling-status-provider-port.js';

export type PollNrwDeliveriesResult = {
  checked: number;
  updated: number;
  unchanged: number;
  unknownStatus: number;
  failed: number;
};

type PollNrwDeliveriesDependencies = {
  repository: DeliveryRepositoryPort;
  pollingProvider: PollingStatusProviderPort;
  clock: ClockPort;
};

export class PollNrwDeliveriesUseCase {
  private readonly repository: DeliveryRepositoryPort;
  private readonly pollingProvider: PollingStatusProviderPort;
  private readonly clock: ClockPort;

  constructor(dependencies: PollNrwDeliveriesDependencies) {
    this.repository = dependencies.repository;
    this.pollingProvider = dependencies.pollingProvider;
    this.clock = dependencies.clock;
  }

  async execute(): Promise<PollNrwDeliveriesResult> {
    const deliveries = await this.repository.findNrwDeliveriesPendingPolling();
    const result: PollNrwDeliveriesResult = {
      checked: deliveries.length,
      updated: 0,
      unchanged: 0,
      unknownStatus: 0,
      failed: 0,
    };

    for (const delivery of deliveries) {
      try {
        const pollingResult = await this.pollingProvider.pollStatus({
          providerDeliveryId: delivery.providerDeliveryId,
          currentStatus: delivery.status,
        });

        if (pollingResult.kind === 'unchanged') {
          result.unchanged += 1;
          continue;
        }

        if (pollingResult.kind === 'unknown-status') {
          result.unknownStatus += 1;
          continue;
        }

        if (pollingResult.status === delivery.status) {
          result.unchanged += 1;
          continue;
        }

        await this.repository.updateLatestStatus(
          delivery.id,
          pollingResult.status,
          this.clock.now(),
        );
        result.updated += 1;
      } catch {
        result.failed += 1;
      }
    }

    return result;
  }
}
