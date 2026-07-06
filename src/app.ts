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
  deliveryUseCases?: DeliveryRouteUseCases;
};

type DeliveryRouteUseCases = {
  createDeliveryUseCase: {
    execute(command: unknown): Promise<Delivery>;
  };
  getDeliveryStatusUseCase: {
    execute(deliveryId: string): Promise<GetDeliveryStatusResult>;
  };
  handleTlsWebhookUseCase: {
    execute(command: unknown): Promise<HandleTlsWebhookResult>;
  };
};

export function buildApp(options: BuildAppOptions = {}) {
  assertNoLegacyUseCaseOverrides(options);
  const deliveryUseCases = resolveDeliveryUseCases(options);

  const app = Fastify({
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        removeAdditional: false,
      },
    },
  });

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

    registerDeliveryRoutes(routesApp, {
      createDeliveryUseCase: deliveryUseCases.createDeliveryUseCase,
      getDeliveryStatusUseCase: deliveryUseCases.getDeliveryStatusUseCase,
    });
    registerWebhookRoutes(routesApp, {
      handleTlsWebhookUseCase: deliveryUseCases.handleTlsWebhookUseCase,
    });

    done();
  });

  return app;
}

function resolveDeliveryUseCases(options: BuildAppOptions): DeliveryRouteUseCases {
  if (options.deliveryUseCases === undefined) {
    return buildDeliveryUseCases();
  }

  const deliveryUseCases = options.deliveryUseCases as Partial<DeliveryRouteUseCases>;

  if (
    deliveryUseCases.createDeliveryUseCase === undefined ||
    deliveryUseCases.getDeliveryStatusUseCase === undefined ||
    deliveryUseCases.handleTlsWebhookUseCase === undefined
  ) {
    throw new Error(
      'deliveryUseCases must include createDeliveryUseCase, getDeliveryStatusUseCase, and handleTlsWebhookUseCase',
    );
  }

  return options.deliveryUseCases;
}

function assertNoLegacyUseCaseOverrides(options: BuildAppOptions): void {
  const legacyOptions = options as BuildAppOptions & {
    createDeliveryUseCase?: unknown;
    getDeliveryStatusUseCase?: unknown;
    handleTlsWebhookUseCase?: unknown;
  };

  if (
    legacyOptions.createDeliveryUseCase !== undefined ||
    legacyOptions.getDeliveryStatusUseCase !== undefined ||
    legacyOptions.handleTlsWebhookUseCase !== undefined
  ) {
    throw new Error('Pass delivery use cases as one deliveryUseCases object');
  }
}
