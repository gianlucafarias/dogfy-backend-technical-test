import {
  DeliveryNotFoundError,
  InvalidDeliveryInputError,
} from './application-errors.js';
import type { ClockPort } from './ports/clock-port.js';
import type { DeliveryRepositoryPort } from './ports/delivery-repository-port.js';
import type { DeliveryStatus } from '../domain/delivery-status.js';
import { DomainValidationError } from '../domain/domain-errors.js';
import { requireNonEmptyString, requireRecord } from '../domain/validation.js';

export type HandleTlsWebhookCommand = {
  providerDeliveryId: string;
  status: string;
};

export type HandleTlsWebhookResult = {
  deliveryId: string;
  status: DeliveryStatus;
  statusUpdatedAt: Date;
};

type TlsStatusMapper = (status: string) => DeliveryStatus | null;

type HandleTlsWebhookDependencies = {
  repository: DeliveryRepositoryPort;
  mapStatus: TlsStatusMapper;
  clock: ClockPort;
};

export class HandleTlsWebhookUseCase {
  private readonly repository: DeliveryRepositoryPort;
  private readonly mapStatus: TlsStatusMapper;
  private readonly clock: ClockPort;

  constructor(dependencies: HandleTlsWebhookDependencies) {
    this.repository = dependencies.repository;
    this.mapStatus = dependencies.mapStatus;
    this.clock = dependencies.clock;
  }

  async execute(command: unknown): Promise<HandleTlsWebhookResult> {
    const normalizedCommand = this.normalizeCommand(command);
    const status = this.mapStatus(normalizedCommand.status);

    if (status === null) {
      throw new InvalidDeliveryInputError(
        `Unsupported TLS status: ${normalizedCommand.status}`,
      );
    }

    const delivery = await this.repository.findByProviderDeliveryId(
      'TLS',
      normalizedCommand.providerDeliveryId,
    );

    if (delivery === null) {
      throw new DeliveryNotFoundError(normalizedCommand.providerDeliveryId);
    }

    const now = this.clock.now();

    await this.repository.updateLatestStatus(delivery.id, status, now);

    return {
      deliveryId: delivery.id,
      status,
      statusUpdatedAt: now,
    };
  }

  private normalizeCommand(command: unknown): HandleTlsWebhookCommand {
    try {
      const payload = requireRecord(command, 'tlsWebhook');

      return {
        providerDeliveryId: requireNonEmptyString(
          payload.providerDeliveryId,
          'providerDeliveryId',
        ),
        status: requireNonEmptyString(payload.status, 'status'),
      };
    } catch (error) {
      if (error instanceof DomainValidationError) {
        throw new InvalidDeliveryInputError(error.message);
      }

      throw error;
    }
  }
}
