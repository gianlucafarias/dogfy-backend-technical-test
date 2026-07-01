import type { ShipmentDetails } from '../../domain/delivery.js';
import type {
  CreateProviderDeliveryResult,
  ShippingProviderPort,
} from '../../application/ports/shipping-provider-port.js';
import { buildProviderDeliveryId, buildTextLabel } from './provider-label.js';

export class TlsShippingProvider implements ShippingProviderPort {
  async createDelivery(command: ShipmentDetails): Promise<CreateProviderDeliveryResult> {
    return {
      providerDeliveryId: buildProviderDeliveryId('tls', command.orderReference),
      label: {
        format: 'text',
        content: buildTextLabel('TLS', command),
      },
      initialStatus: 'created',
    };
  }
}
