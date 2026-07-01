import type { PollNrwDeliveriesUseCase } from '../../application/poll-nrw-deliveries.js';

const DEFAULT_POLLING_INTERVAL_MS = 5000;

type PollingJobLogger = {
  error(message: string): void;
};

type NrwPollingJobDependencies = {
  useCase: PollNrwDeliveriesUseCase;
  intervalMs: number;
  logger?: PollingJobLogger;
};

export class NrwPollingJob {
  private readonly useCase: PollNrwDeliveriesUseCase;
  private readonly intervalMs: number;
  private readonly logger?: PollingJobLogger;
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(dependencies: NrwPollingJobDependencies) {
    this.useCase = dependencies.useCase;
    this.intervalMs = dependencies.intervalMs;
    this.logger = dependencies.logger;
  }

  start(): void {
    if (this.timer !== undefined) {
      return;
    }

    void this.runOnce();
    this.timer = setInterval(() => {
      void this.runOnce();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer === undefined) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }

  private async runOnce(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      await this.useCase.execute();
    } catch (error) {
      this.logger?.error(`NRW polling job failed: ${String(error)}`);
    } finally {
      this.running = false;
    }
  }
}

export function resolvePollingIntervalMs(env: NodeJS.ProcessEnv): number {
  const configuredInterval = env.POLLING_INTERVAL_MS;

  if (configuredInterval === undefined || configuredInterval.trim().length === 0) {
    return DEFAULT_POLLING_INTERVAL_MS;
  }

  const intervalMs = Number(configuredInterval);

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error('POLLING_INTERVAL_MS must be a positive number');
  }

  return Math.trunc(intervalMs);
}
