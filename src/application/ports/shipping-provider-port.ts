import type { DeliveryStatus } from '../../domain/delivery-status.js';
import type { ShipmentDetails } from '../../domain/delivery.js';
import type { Label } from '../../domain/label.js';

export type CreateProviderDeliveryResult = {
  providerDeliveryId: string;
  label: Label;
  initialStatus: DeliveryStatus | string;
};

export interface ShippingProviderPort {
  createDelivery(command: ShipmentDetails): Promise<CreateProviderDeliveryResult>;
}
