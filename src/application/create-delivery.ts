import {
  InvalidDeliveryInputError,
  NoShippingProvidersAvailableError,
  ShippingProviderCreationError,
  UnexpectedProviderStatusError,
} from './application-errors.js';
import type { ClockPort } from './ports/clock-port.js';
import type { DeliveryRepositoryPort } from './ports/delivery-repository-port.js';
import type { IdGeneratorPort } from './ports/id-generator-port.js';
import type { ShippingProviderPort } from './ports/shipping-provider-port.js';
import { selectProviderForOrder } from './provider-selection.js';
import { DomainValidationError } from '../domain/domain-errors.js';
import {
  createDeliveryEntity,
  normalizeShipmentDetails,
  type Delivery,
  type ShipmentDetails,
} from '../domain/delivery.js';
import { providerCodes, type ProviderCode } from '../domain/provider.js';
import type { CreateProviderDeliveryResult } from './ports/shipping-provider-port.js';

type ShippingProviders = Partial<Record<ProviderCode, ShippingProviderPort>>;

type CreateDeliveryUseCaseDependencies = {
  repository: DeliveryRepositoryPort;
  shippingProviders: ShippingProviders;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class CreateDeliveryUseCase {
  private readonly repository: DeliveryRepositoryPort;
  private readonly shippingProviders: ShippingProviders;
  private readonly idGenerator: IdGeneratorPort;
  private readonly clock: ClockPort;

  constructor(dependencies: CreateDeliveryUseCaseDependencies) {
    this.repository = dependencies.repository;
    this.shippingProviders = dependencies.shippingProviders;
    this.idGenerator = dependencies.idGenerator;
    this.clock = dependencies.clock;
  }

  async execute(command: unknown): Promise<Delivery> {
    let shipmentDetails: ShipmentDetails;

    try {
      shipmentDetails = normalizeShipmentDetails(command);
    } catch (error) {
      if (error instanceof DomainValidationError) {
        throw new InvalidDeliveryInputError(error.message);
      }

      throw error;
    }

    const availableProviders = providerCodes.filter((providerCode) => {
      return this.shippingProviders[providerCode] !== undefined;
    });

    if (availableProviders.length === 0) {
      throw new NoShippingProvidersAvailableError();
    }

    const providerCode = selectProviderForOrder(shipmentDetails.orderReference, availableProviders);
    const provider = this.shippingProviders[providerCode];

    if (provider === undefined) {
      throw new NoShippingProvidersAvailableError();
    }

    let providerResult: CreateProviderDeliveryResult;

    try {
      providerResult = await provider.createDelivery(shipmentDetails);
    } catch {
      throw new ShippingProviderCreationError();
    }

    if (providerResult.initialStatus !== 'created') {
      throw new UnexpectedProviderStatusError(String(providerResult.initialStatus));
    }

    let delivery: Delivery;

    try {
      delivery = createDeliveryEntity({
        ...shipmentDetails,
        id: this.idGenerator.generate(),
        provider: providerCode,
        providerDeliveryId: providerResult.providerDeliveryId,
        label: providerResult.label,
        now: this.clock.now(),
      });
    } catch (error) {
      if (error instanceof DomainValidationError) {
        throw new ShippingProviderCreationError(error.message);
      }

      throw error;
    }

    await this.repository.save(delivery);

    return delivery;
  }
}
