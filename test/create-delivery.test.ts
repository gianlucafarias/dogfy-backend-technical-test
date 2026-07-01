import { describe, expect, it } from 'vitest';
import {
  InvalidDeliveryInputError,
  NoShippingProvidersAvailableError,
  ShippingProviderCreationError,
  UnexpectedProviderStatusError,
} from '../src/application/application-errors.js';
import { CreateDeliveryUseCase } from '../src/application/create-delivery.js';
import type { ClockPort } from '../src/application/ports/clock-port.js';
import type { DeliveryRepositoryPort } from '../src/application/ports/delivery-repository-port.js';
import type { IdGeneratorPort } from '../src/application/ports/id-generator-port.js';
import type {
  CreateProviderDeliveryResult,
  ShippingProviderPort,
} from '../src/application/ports/shipping-provider-port.js';
import type { Delivery, ShipmentDetails } from '../src/domain/delivery.js';
import type { ProviderCode } from '../src/domain/provider.js';

describe('CreateDeliveryUseCase', () => {
  it('creates a delivery through the internally selected provider', async () => {
    const repository = new RecordingDeliveryRepository();
    const nrwProvider = new RecordingShippingProvider(providerResult('NRW'));
    const tlsProvider = new RecordingShippingProvider(providerResult('TLS'));
    const useCase = buildUseCase({
      repository,
      nrwProvider,
      tlsProvider,
    });

    const delivery = await useCase.execute(validCommand('DEMO-TLS-001'));

    expect(delivery).toMatchObject({
      id: 'delivery-1',
      orderReference: 'DEMO-TLS-001',
      provider: 'TLS',
      providerDeliveryId: 'tls-provider-delivery',
      label: {
        format: 'text',
        content: 'TLS printable label',
      },
      status: 'created',
    });
    expect(delivery.createdAt).toEqual(new Date('2026-07-01T10:00:00.000Z'));
    expect(delivery.updatedAt).toEqual(new Date('2026-07-01T10:00:00.000Z'));
    expect(delivery.statusUpdatedAt).toEqual(new Date('2026-07-01T10:00:00.000Z'));
    expect(nrwProvider.calls).toHaveLength(0);
    expect(tlsProvider.calls).toHaveLength(1);
    expect(tlsProvider.calls[0]?.orderReference).toBe('DEMO-TLS-001');
    expect(repository.savedDeliveries).toEqual([delivery]);
  });

  it('fails before calling providers when the command is invalid', async () => {
    const nrwProvider = new RecordingShippingProvider(providerResult('NRW'));
    const useCase = buildUseCase({
      nrwProvider,
      tlsProvider: new RecordingShippingProvider(providerResult('TLS')),
    });

    await expect(
      useCase.execute({
        ...validCommand('DEMO-NRW-002'),
        orderReference: '   ',
      }),
    ).rejects.toBeInstanceOf(InvalidDeliveryInputError);
    expect(nrwProvider.calls).toHaveLength(0);
  });

  it('fails when no providers are available', async () => {
    const useCase = buildUseCase({
      nrwProvider: undefined,
      tlsProvider: undefined,
    });

    await expect(useCase.execute(validCommand('DEMO-NRW-002'))).rejects.toBeInstanceOf(
      NoShippingProvidersAvailableError,
    );
  });

  it('wraps provider creation failures', async () => {
    const useCase = buildUseCase({
      nrwProvider: new ThrowingShippingProvider(),
      tlsProvider: new RecordingShippingProvider(providerResult('TLS')),
    });

    await expect(useCase.execute(validCommand('DEMO-NRW-002'))).rejects.toBeInstanceOf(
      ShippingProviderCreationError,
    );
  });

  it('rejects an unexpected initial status from a provider', async () => {
    const useCase = buildUseCase({
      nrwProvider: new RecordingShippingProvider({
        ...providerResult('NRW'),
        initialStatus: 'ready_for_pickup',
      }),
      tlsProvider: new RecordingShippingProvider(providerResult('TLS')),
    });

    await expect(useCase.execute(validCommand('DEMO-NRW-002'))).rejects.toBeInstanceOf(
      UnexpectedProviderStatusError,
    );
  });
});

function buildUseCase(dependencies: {
  repository?: RecordingDeliveryRepository;
  nrwProvider?: ShippingProviderPort;
  tlsProvider?: ShippingProviderPort;
}) {
  return new CreateDeliveryUseCase({
    repository: dependencies.repository ?? new RecordingDeliveryRepository(),
    shippingProviders: {
      NRW: dependencies.nrwProvider,
      TLS: dependencies.tlsProvider,
    },
    idGenerator: new FixedIdGenerator(),
    clock: new FixedClock(),
  });
}

function validCommand(orderReference: string): ShipmentDetails {
  return {
    orderReference,
    recipient: {
      name: 'Jane Doe',
      phone: '+34123456789',
      email: 'jane@example.com',
    },
    address: {
      line1: 'Calle Example 123',
      line2: '2A',
      postalCode: '08001',
      city: 'Barcelona',
      country: 'ES',
    },
    package: {
      weightGrams: 1200,
    },
  };
}

function providerResult(providerName: 'NRW' | 'TLS'): CreateProviderDeliveryResult {
  return {
    providerDeliveryId: `${providerName.toLowerCase()}-provider-delivery`,
    label: {
      format: 'text',
      content: `${providerName} printable label`,
    },
    initialStatus: 'created',
  };
}

class RecordingDeliveryRepository implements DeliveryRepositoryPort {
  readonly savedDeliveries: Delivery[] = [];

  async save(delivery: Delivery): Promise<void> {
    this.savedDeliveries.push(delivery);
  }

  async findById(id: string): Promise<Delivery | null> {
    return this.savedDeliveries.find((delivery) => delivery.id === id) ?? null;
  }

  async findByProviderDeliveryId(
    provider: ProviderCode,
    providerDeliveryId: string,
  ): Promise<Delivery | null> {
    return (
      this.savedDeliveries.find((delivery) => {
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

  async updateLatestStatus(): Promise<void> {
    return;
  }
}

class RecordingShippingProvider implements ShippingProviderPort {
  readonly calls: ShipmentDetails[] = [];
  private readonly result: CreateProviderDeliveryResult;

  constructor(result: CreateProviderDeliveryResult) {
    this.result = result;
  }

  async createDelivery(command: ShipmentDetails): Promise<CreateProviderDeliveryResult> {
    this.calls.push(command);

    return this.result;
  }
}

class ThrowingShippingProvider implements ShippingProviderPort {
  async createDelivery(): Promise<CreateProviderDeliveryResult> {
    throw new Error('provider down');
  }
}

class FixedIdGenerator implements IdGeneratorPort {
  generate(): string {
    return 'delivery-1';
  }
}

class FixedClock implements ClockPort {
  now(): Date {
    return new Date('2026-07-01T10:00:00.000Z');
  }
}
