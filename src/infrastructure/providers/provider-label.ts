import { randomUUID } from 'node:crypto';
import type { ShipmentDetails } from '../../domain/delivery.js';

export function buildTextLabel(providerName: string, command: ShipmentDetails): string {
  return [
    `${providerName} SHIPPING LABEL`,
    `Order: ${command.orderReference}`,
    `Recipient: ${command.recipient.name}`,
    `Address: ${command.address.line1}, ${command.address.postalCode} ${command.address.city}`,
    `Package weight: ${command.package.weightGrams}g`,
  ].join('\n');
}

export function buildProviderDeliveryId(prefix: string, orderReference: string): string {
  const normalizedReference = orderReference.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');

  return `${prefix}_${normalizedReference}_${randomUUID()}`;
}
