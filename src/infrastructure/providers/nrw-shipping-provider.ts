import type { ShipmentDetails } from '../../domain/delivery.js';
import type {
  CreateProviderDeliveryResult,
  ShippingProviderPort,
} from '../../application/ports/shipping-provider-port.js';
import { buildProviderDeliveryId, buildTextLabel } from './provider-label.js';

export class NrwShippingProvider implements ShippingProviderPort {
  async createDelivery(command: ShipmentDetails): Promise<CreateProviderDeliveryResult> {
    return {
      providerDeliveryId: buildProviderDeliveryId('nrw', command.orderReference),
      label: {
        format: 'text',
        content: buildTextLabel('NRW', command),
      },
      initialStatus: 'created',
    };
  }
}
