import { CreateDeliveryUseCase } from './application/create-delivery.js';
import { GetDeliveryStatusUseCase } from './application/get-delivery-status.js';
import type { DeliveryRepositoryPort } from './application/ports/delivery-repository-port.js';
import { PollNrwDeliveriesUseCase } from './application/poll-nrw-deliveries.js';
import { NrwShippingProvider } from './infrastructure/providers/nrw-shipping-provider.js';
import { TlsShippingProvider } from './infrastructure/providers/tls-shipping-provider.js';
import { InMemoryDeliveryRepository } from './infrastructure/repositories/in-memory-delivery-repository.js';
import { SystemClock } from './infrastructure/system-clock.js';
import { UuidIdGenerator } from './infrastructure/uuid-id-generator.js';

type BuildCreateDeliveryUseCaseOptions = {
  repository?: DeliveryRepositoryPort;
};

type BuildDeliveryUseCasesOptions = {
  repository?: DeliveryRepositoryPort;
};

export function buildDeliveryUseCases(options: BuildDeliveryUseCasesOptions = {}) {
  const repository = options.repository ?? new InMemoryDeliveryRepository();
  const nrwProvider = new NrwShippingProvider();
  const clock = new SystemClock();

  return {
    createDeliveryUseCase: new CreateDeliveryUseCase({
      repository,
      shippingProviders: {
        NRW: nrwProvider,
        TLS: new TlsShippingProvider(),
      },
      idGenerator: new UuidIdGenerator(),
      clock,
    }),
    getDeliveryStatusUseCase: buildGetDeliveryStatusUseCase({ repository }),
    pollNrwDeliveriesUseCase: new PollNrwDeliveriesUseCase({
      repository,
      pollingProvider: nrwProvider,
      clock,
    }),
  };
}

export function buildCreateDeliveryUseCase(
  options: BuildCreateDeliveryUseCaseOptions = {},
): CreateDeliveryUseCase {
  return new CreateDeliveryUseCase({
    repository: options.repository ?? new InMemoryDeliveryRepository(),
    shippingProviders: {
      NRW: new NrwShippingProvider(),
      TLS: new TlsShippingProvider(),
    },
    idGenerator: new UuidIdGenerator(),
    clock: new SystemClock(),
  });
}

export function buildGetDeliveryStatusUseCase(
  options: BuildCreateDeliveryUseCaseOptions = {},
): GetDeliveryStatusUseCase {
  return new GetDeliveryStatusUseCase(options.repository ?? new InMemoryDeliveryRepository());
}
