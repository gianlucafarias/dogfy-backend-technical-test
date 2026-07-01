import type { FastifyInstance } from 'fastify';
import {
  DeliveryNotFoundError,
  InvalidDeliveryInputError,
} from '../application/application-errors.js';
import type { HandleTlsWebhookResult } from '../application/handle-tls-webhook.js';
import { deliveryStatuses } from '../domain/delivery-status.js';

type HandleTlsWebhookHandler = {
  execute(command: unknown): Promise<HandleTlsWebhookResult>;
};

type RegisterWebhookRoutesDependencies = {
  handleTlsWebhookUseCase: HandleTlsWebhookHandler;
};

const tlsWebhookBodySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['providerDeliveryId', 'status'],
  properties: {
    providerDeliveryId: { type: 'string', minLength: 1 },
    status: { type: 'string', minLength: 1 },
  },
} as const;

const tlsWebhookResponseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['deliveryId', 'status', 'statusUpdatedAt'],
  properties: {
    deliveryId: { type: 'string' },
    status: { type: 'string', enum: deliveryStatuses },
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

export function registerWebhookRoutes(
  app: FastifyInstance,
  dependencies: RegisterWebhookRoutesDependencies,
): void {
  app.post(
    '/webhooks/tls/status',
    {
      schema: {
        body: tlsWebhookBodySchema,
        response: {
          200: tlsWebhookResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await dependencies.handleTlsWebhookUseCase.execute(request.body);

        return reply.code(200).send(toTlsWebhookResponse(result));
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

function toTlsWebhookResponse(result: HandleTlsWebhookResult) {
  return {
    deliveryId: result.deliveryId,
    status: result.status,
    statusUpdatedAt: result.statusUpdatedAt.toISOString(),
  };
}
