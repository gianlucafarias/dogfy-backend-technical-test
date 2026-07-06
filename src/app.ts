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

type SchemaValidationError = {
  keyword: string;
  instancePath: string;
  params: Record<string, unknown>;
  message?: string;
};

type FastifyRequestValidationError = {
  statusCode: number;
  validation: readonly SchemaValidationError[];
  validationContext?: string;
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
  app.setErrorHandler((error, _request, reply) => {
    if (isRequestValidationError(error)) {
      return reply.code(400).send({
        error: formatSchemaValidationError(
          error.validationContext ?? 'request',
          error.validation,
        ),
      });
    }

    return reply.send(error instanceof Error ? error : new Error(String(error)));
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

function formatSchemaValidationError(
  context: string,
  errors: readonly SchemaValidationError[],
): string {
  const firstError = errors[0];

  if (firstError === undefined) {
    return `Invalid ${context}`;
  }

  if (firstError.keyword === 'required') {
    const field = joinValidationPath(
      firstError.instancePath,
      stringParam(firstError, 'missingProperty'),
    );

    return `Invalid ${context}: ${field} is required`;
  }

  if (firstError.keyword === 'additionalProperties') {
    const field = joinValidationPath(
      firstError.instancePath,
      stringParam(firstError, 'additionalProperty'),
    );

    return `Invalid ${context}: ${field} is not allowed`;
  }

  const field = formatValidationPath(firstError.instancePath);

  if (firstError.keyword === 'minLength') {
    return `Invalid ${context}: ${field} must not be empty`;
  }

  if (firstError.keyword === 'exclusiveMinimum') {
    return `Invalid ${context}: ${field} must be greater than ${stringParam(
      firstError,
      'limit',
    )}`;
  }

  return `Invalid ${context}: ${[field, firstError.message]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join(' ')}`;
}

function joinValidationPath(instancePath: string, childPath: string): string {
  const parts = [formatValidationPath(instancePath), childPath].filter(
    (part): part is string => part.length > 0,
  );

  return parts.join('.');
}

function formatValidationPath(instancePath: string): string {
  return instancePath
    .split('/')
    .filter((part) => part.length > 0)
    .map((part) => part.replace(/~1/g, '/').replace(/~0/g, '~'))
    .join('.');
}

function stringParam(error: SchemaValidationError, name: string): string {
  const value = error.params[name];

  return typeof value === 'string' ? value : '';
}

function isRequestValidationError(error: unknown): error is FastifyRequestValidationError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as Partial<FastifyRequestValidationError>;

  return candidate.statusCode === 400 && Array.isArray(candidate.validation);
}
