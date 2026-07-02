import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { buildDeliveryUseCases } from './composition-root.js';
import { registerDeliveryRoutes } from './http/deliveries-routes.js';
import { registerWebhookRoutes } from './http/webhooks-routes.js';
import type { Delivery } from './domain/delivery.js';
import type { GetDeliveryStatusResult } from './application/get-delivery-status.js';
import type { HandleTlsWebhookResult } from './application/handle-tls-webhook.js';

type BuildAppOptions = {
  logger?: boolean;
  createDeliveryUseCase?: {
    execute(command: unknown): Promise<Delivery>;
  };
  getDeliveryStatusUseCase?: {
    execute(deliveryId: string): Promise<GetDeliveryStatusResult>;
  };
  handleTlsWebhookUseCase?: {
    execute(command: unknown): Promise<HandleTlsWebhookResult>;
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
  const handleTlsWebhookUseCase =
    options.handleTlsWebhookUseCase ?? defaultUseCases.handleTlsWebhookUseCase;

  app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Dogfy Logistics API',
        description: 'Internal logistics API for creating deliveries and reading status.',
        version: '1.0.0',
      },
    },
  });

  app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  app.register((routesApp, _options, done) => {
    routesApp.get('/health', async () => {
      return { status: 'ok' };
    });

    registerDeliveryRoutes(routesApp, { createDeliveryUseCase, getDeliveryStatusUseCase });
    registerWebhookRoutes(routesApp, { handleTlsWebhookUseCase });

    done();
  });

  return app;
}
