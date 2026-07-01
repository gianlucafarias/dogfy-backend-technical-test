import type { DeliveryStatus } from '../../domain/delivery-status.js';
import type { Label } from '../../domain/label.js';
import type { ProviderCode } from '../../domain/provider.js';

export type MongoDeliveryDocument = {
  _id: string;
  orderReference: string;
  recipient: {
    name: string;
    phone?: string;
    email?: string;
  };
  address: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
  };
  package: {
    weightGrams: number;
  };
  provider: {
    code: ProviderCode;
    deliveryId: string;
  };
  label: Label;
  status: DeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
  statusUpdatedAt: Date;
};
