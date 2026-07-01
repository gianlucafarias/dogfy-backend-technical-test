import Fastify from 'fastify';
import { buildDeliveryUseCases } from './composition-root.js';
import { registerDeliveryRoutes } from './http/deliveries-routes.js';
import type { Delivery } from './domain/delivery.js';
import type { GetDeliveryStatusResult } from './application/get-delivery-status.js';

type BuildAppOptions = {
  logger?: boolean;
  createDeliveryUseCase?: {
    execute(command: unknown): Promise<Delivery>;
  };
  getDeliveryStatusUseCase?: {
    execute(deliveryId: string): Promise<GetDeliveryStatusResult>;
  };
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });
  const defaultUseCases = buildDeliveryUseCases();
  const createDeliveryUseCase =
    options.createDeliveryUseCase ?? defaultUseCases.createDeliveryUseCase;
  const getDeliveryStatusUseCase =
    options.getDeliveryStatusUseCase ?? defaultUseCases.getDeliveryStatusUseCase;

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  registerDeliveryRoutes(app, { createDeliveryUseCase, getDeliveryStatusUseCase });

  return app;
}
