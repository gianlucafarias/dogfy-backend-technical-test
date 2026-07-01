import Fastify from 'fastify';
import { buildCreateDeliveryUseCase } from './composition-root.js';
import { registerDeliveryRoutes } from './http/deliveries-routes.js';
import type { Delivery } from './domain/delivery.js';

type BuildAppOptions = {
  logger?: boolean;
  createDeliveryUseCase?: {
    execute(command: unknown): Promise<Delivery>;
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
  const createDeliveryUseCase = options.createDeliveryUseCase ?? buildCreateDeliveryUseCase();

  app.get('/health', async () => {
    return { status: 'ok' };
  });

  registerDeliveryRoutes(app, { createDeliveryUseCase });

  return app;
}
