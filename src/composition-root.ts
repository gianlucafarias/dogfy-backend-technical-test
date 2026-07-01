import { CreateDeliveryUseCase } from './application/create-delivery.js';
import { NrwShippingProvider } from './infrastructure/providers/nrw-shipping-provider.js';
import { TlsShippingProvider } from './infrastructure/providers/tls-shipping-provider.js';
import { InMemoryDeliveryRepository } from './infrastructure/repositories/in-memory-delivery-repository.js';
import { SystemClock } from './infrastructure/system-clock.js';
import { UuidIdGenerator } from './infrastructure/uuid-id-generator.js';

export function buildCreateDeliveryUseCase(): CreateDeliveryUseCase {
  return new CreateDeliveryUseCase({
    repository: new InMemoryDeliveryRepository(),
    shippingProviders: {
      NRW: new NrwShippingProvider(),
      TLS: new TlsShippingProvider(),
    },
    idGenerator: new UuidIdGenerator(),
    clock: new SystemClock(),
  });
}
