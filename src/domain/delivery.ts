import { DomainValidationError } from './domain-errors.js';
import type { DeliveryStatus } from './delivery-status.js';
import type { Label } from './label.js';
import { normalizeLabel } from './label.js';
import type { ProviderCode } from './provider.js';
import { isProviderCode } from './provider.js';
import {
  optionalNonEmptyString,
  requireNonEmptyString,
  requirePositiveNumber,
  requireRecord,
} from './validation.js';

export type Recipient = {
  name: string;
  phone?: string;
  email?: string;
};

export type DeliveryAddress = {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
};

export type DeliveryPackage = {
  weightGrams: number;
};

export type ShipmentDetails = {
  orderReference: string;
  recipient: Recipient;
  address: DeliveryAddress;
  package: DeliveryPackage;
};

export type Delivery = ShipmentDetails & {
  id: string;
  provider: ProviderCode;
  providerDeliveryId: string;
  label: Label;
  status: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
  statusUpdatedAt: Date;
};

type CreateDeliveryEntityParams = ShipmentDetails & {
  id: string;
  provider: ProviderCode;
  providerDeliveryId: string;
  label: Label;
  now: Date;
};

export function normalizeShipmentDetails(input: unknown): ShipmentDetails {
  const delivery = requireRecord(input, 'delivery');
  const recipient = requireRecord(delivery.recipient, 'recipient');
  const address = requireRecord(delivery.address, 'address');
  const packageDetails = requireRecord(delivery.package, 'package');

  return {
    orderReference: requireNonEmptyString(delivery.orderReference, 'orderReference'),
    recipient: {
      name: requireNonEmptyString(recipient.name, 'recipient.name'),
      phone: optionalNonEmptyString(recipient.phone, 'recipient.phone'),
      email: optionalNonEmptyString(recipient.email, 'recipient.email'),
    },
    address: {
      line1: requireNonEmptyString(address.line1, 'address.line1'),
      line2: optionalNonEmptyString(address.line2, 'address.line2'),
      postalCode: requireNonEmptyString(address.postalCode, 'address.postalCode'),
      city: requireNonEmptyString(address.city, 'address.city'),
      country: requireNonEmptyString(address.country, 'address.country'),
    },
    package: {
      weightGrams: requirePositiveNumber(packageDetails.weightGrams, 'package.weightGrams'),
    },
  };
}

export function createDeliveryEntity(params: CreateDeliveryEntityParams): Delivery {
  const shipmentDetails = normalizeShipmentDetails(params);

  if (!isProviderCode(params.provider)) {
    throw new DomainValidationError('provider must be supported');
  }

  if (!(params.now instanceof Date) || Number.isNaN(params.now.getTime())) {
    throw new DomainValidationError('now must be a valid date');
  }

  const now = new Date(params.now);

  return {
    id: requireNonEmptyString(params.id, 'id'),
    ...shipmentDetails,
    provider: params.provider,
    providerDeliveryId: requireNonEmptyString(params.providerDeliveryId, 'providerDeliveryId'),
    label: normalizeLabel(params.label),
    status: 'created',
    createdAt: now,
    updatedAt: now,
    statusUpdatedAt: now,
  };
}
