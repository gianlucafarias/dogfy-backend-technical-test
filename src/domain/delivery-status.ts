export const deliveryStatuses = ['created', 'in_transit', 'delivered', 'failed'] as const;

export type DeliveryStatus = (typeof deliveryStatuses)[number];

export function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return typeof value === 'string' && deliveryStatuses.includes(value as DeliveryStatus);
}
