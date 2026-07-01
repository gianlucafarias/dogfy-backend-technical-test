import type { FastifyInstance } from 'fastify';
import {
  InvalidDeliveryInputError,
  NoShippingProvidersAvailableError,
  ShippingProviderCreationError,
  UnexpectedProviderStatusError,
} from '../application/application-errors.js';
import type { Delivery } from '../domain/delivery.js';

type CreateDeliveryHandler = {
  execute(command: unknown): Promise<Delivery>;
};

type RegisterDeliveryRoutesDependencies = {
  createDeliveryUseCase: CreateDeliveryHandler;
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
