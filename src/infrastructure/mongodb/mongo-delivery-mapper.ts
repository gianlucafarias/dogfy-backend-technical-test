import { DomainValidationError } from '../../domain/domain-errors.js';
import { isDeliveryStatus } from '../../domain/delivery-status.js';
import type { Delivery } from '../../domain/delivery.js';
import { normalizeShipmentDetails } from '../../domain/delivery.js';
import { normalizeLabel } from '../../domain/label.js';
import { isProviderCode } from '../../domain/provider.js';
import { requireNonEmptyString } from '../../domain/validation.js';
import type { MongoDeliveryDocument } from './mongo-delivery-document.js';

export function toMongoDeliveryDocument(delivery: Delivery): MongoDeliveryDocument {
  return {
    _id: delivery.id,
    orderReference: delivery.orderReference,
    recipient: omitUndefinedValues({
      name: delivery.recipient.name,
      phone: delivery.recipient.phone,
      email: delivery.recipient.email,
    }),
    address: omitUndefinedValues({
      line1: delivery.address.line1,
      line2: delivery.address.line2,
      postalCode: delivery.address.postalCode,
      city: delivery.address.city,
      country: delivery.address.country,
    }),
    package: {
      ...delivery.package,
    },
    provider: {
      code: delivery.provider,
      deliveryId: delivery.providerDeliveryId,
    },
    label: {
      ...delivery.label,
    },
    status: delivery.status,
    createdAt: new Date(delivery.createdAt),
    updatedAt: new Date(delivery.updatedAt),
    statusUpdatedAt: new Date(delivery.statusUpdatedAt),
  };
}

export function toDelivery(document: MongoDeliveryDocument): Delivery {
  const shipmentDetails = normalizeShipmentDetails({
    orderReference: document.orderReference,
    recipient: {
      name: document.recipient.name,
      phone: nullToUndefined(document.recipient.phone),
      email: nullToUndefined(document.recipient.email),
    },
    address: {
      line1: document.address.line1,
      line2: nullToUndefined(document.address.line2),
      postalCode: document.address.postalCode,
      city: document.address.city,
      country: document.address.country,
    },
    package: document.package,
  });

  if (!isProviderCode(document.provider.code)) {
    throw new DomainValidationError('document.provider.code must be supported');
  }

  if (!isDeliveryStatus(document.status)) {
    throw new DomainValidationError('document.status must be supported');
  }

  return {
    id: requireNonEmptyString(document._id, '_id'),
    ...shipmentDetails,
    provider: document.provider.code,
    providerDeliveryId: requireNonEmptyString(
      document.provider.deliveryId,
      'provider.deliveryId',
    ),
    label: normalizeLabel(document.label),
    status: document.status,
    createdAt: requireValidDate(document.createdAt, 'createdAt'),
    updatedAt: requireValidDate(document.updatedAt, 'updatedAt'),
    statusUpdatedAt: requireValidDate(document.statusUpdatedAt, 'statusUpdatedAt'),
  };
}

function requireValidDate(value: Date, fieldName: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new DomainValidationError(`${fieldName} must be a valid date`);
  }

  return date;
}

function omitUndefinedValues<T extends Record<string, unknown>>(object: T): T {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  ) as T;
}

function nullToUndefined(value: unknown): unknown {
  return value === null ? undefined : value;
}
