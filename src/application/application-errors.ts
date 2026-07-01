export class InvalidDeliveryInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDeliveryInputError';
  }
}

export class DeliveryNotFoundError extends Error {
  constructor(deliveryId: string) {
    super(`Delivery not found: ${deliveryId}`);
    this.name = 'DeliveryNotFoundError';
  }
}

export class NoShippingProvidersAvailableError extends Error {
  constructor() {
    super('No shipping providers are available');
    this.name = 'NoShippingProvidersAvailableError';
  }
}

export class ShippingProviderCreationError extends Error {
  constructor(message = 'Shipping provider failed to create delivery') {
    super(message);
    this.name = 'ShippingProviderCreationError';
  }
}

export class UnexpectedProviderStatusError extends Error {
  constructor(status: string) {
    super(`Provider returned unexpected initial status: ${status}`);
    this.name = 'UnexpectedProviderStatusError';
  }
}
