import type { FastifyInstance } from 'fastify';
import {
  DeliveryNotFoundError,
  InvalidDeliveryInputError,
  NoShippingProvidersAvailableError,
  ShippingProviderCreationError,
  UnexpectedProviderStatusError,
} from '../application/application-errors.js';
import type { GetDeliveryStatusResult } from '../application/get-delivery-status.js';
import type { Delivery } from '../domain/delivery.js';
import { deliveryStatuses } from '../domain/delivery-status.js';

type CreateDeliveryHandler = {
  execute(command: unknown): Promise<Delivery>;
};

type GetDeliveryStatusHandler = {
  execute(deliveryId: string): Promise<GetDeliveryStatusResult>;
};

type RegisterDeliveryRoutesDependencies = {
  createDeliveryUseCase: CreateDeliveryHandler;
  getDeliveryStatusUseCase: GetDeliveryStatusHandler;
};

const createDeliveryBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['orderReference', 'recipient', 'address', 'package'],
  properties: {
    orderReference: { type: 'string', minLength: 1 },
    recipient: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 1 },
        phone: { type: 'string', minLength: 1 },
        email: { type: 'string', minLength: 1 },
      },
    },
    address: {
      type: 'object',
      additionalProperties: false,
      required: ['line1', 'postalCode', 'city', 'country'],
      properties: {
        line1: { type: 'string', minLength: 1 },
        line2: { type: 'string', minLength: 1 },
        postalCode: { type: 'string', minLength: 1 },
        city: { type: 'string', minLength: 1 },
        country: { type: 'string', minLength: 1 },
      },
    },
    package: {
      type: 'object',
      additionalProperties: false,
      required: ['weightGrams'],
      properties: {
        weightGrams: { type: 'number', exclusiveMinimum: 0 },
      },
    },
  },
} as const;

const createDeliveryResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'orderReference',
    'provider',
    'providerDeliveryId',
    'label',
    'status',
    'createdAt',
    'updatedAt',
    'statusUpdatedAt',
  ],
  properties: {
    id: { type: 'string' },
    orderReference: { type: 'string' },
    provider: { type: 'string', enum: ['NRW', 'TLS'] },
    providerDeliveryId: { type: 'string' },
    label: {
      type: 'object',
      additionalProperties: false,
      required: ['format', 'content'],
      properties: {
        format: { type: 'string', enum: ['text'] },
        content: { type: 'string' },
      },
    },
    status: { type: 'string', enum: ['created'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
    statusUpdatedAt: { type: 'string' },
  },
} as const;

const errorResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['error'],
  properties: {
    error: { type: 'string' },
  },
} as const;

const deliveryStatusParamsSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
} as const;

const deliveryStatusResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['deliveryId', 'status', 'statusUpdatedAt'],
  properties: {
    deliveryId: { type: 'string' },
    status: { type: 'string', enum: deliveryStatuses },
    statusUpdatedAt: { type: 'string' },
  },
} as const;

export function registerDeliveryRoutes(
  app: FastifyInstance,
  dependencies: RegisterDeliveryRoutesDependencies,
): void {
  app.post(
    '/deliveries',
    {
      schema: {
        body: createDeliveryBodySchema,
        response: {
          201: createDeliveryResponseSchema,
          400: errorResponseSchema,
          502: errorResponseSchema,
          503: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const delivery = await dependencies.createDeliveryUseCase.execute(request.body);

        return reply.code(201).send(toCreateDeliveryResponse(delivery));
      } catch (error) {
        if (error instanceof InvalidDeliveryInputError) {
          return reply.code(400).send({ error: error.message });
        }

        if (error instanceof NoShippingProvidersAvailableError) {
          return reply.code(503).send({ error: error.message });
        }

        if (
          error instanceof ShippingProviderCreationError ||
          error instanceof UnexpectedProviderStatusError
        ) {
          return reply.code(502).send({ error: error.message });
        }

        throw error;
      }
    },
  );

  app.get(
    '/deliveries/:id/status',
    {
      schema: {
        params: deliveryStatusParamsSchema,
        response: {
          200: deliveryStatusResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const deliveryStatus = await dependencies.getDeliveryStatusUseCase.execute(id);

        return reply.code(200).send(toDeliveryStatusResponse(deliveryStatus));
      } catch (error) {
        if (error instanceof InvalidDeliveryInputError) {
          return reply.code(400).send({ error: error.message });
        }

        if (error instanceof DeliveryNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }

        throw error;
      }
    },
  );
}

function toCreateDeliveryResponse(delivery: Delivery) {
  return {
    id: delivery.id,
    orderReference: delivery.orderReference,
    provider: delivery.provider,
    providerDeliveryId: delivery.providerDeliveryId,
    label: delivery.label,
    status: delivery.status,
    createdAt: delivery.createdAt.toISOString(),
    updatedAt: delivery.updatedAt.toISOString(),
    statusUpdatedAt: delivery.statusUpdatedAt.toISOString(),
  };
}

function toDeliveryStatusResponse(deliveryStatus: GetDeliveryStatusResult) {
  return {
    deliveryId: deliveryStatus.deliveryId,
    status: deliveryStatus.status,
    statusUpdatedAt: deliveryStatus.statusUpdatedAt.toISOString(),
  };
}
