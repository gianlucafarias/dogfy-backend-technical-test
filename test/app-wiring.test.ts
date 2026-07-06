import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { buildDeliveryUseCases } from '../src/composition-root.js';

describe('buildApp wiring', () => {
  it('rejects partial delivery use case overrides', () => {
    const useCases = buildDeliveryUseCases();

    expect(() => {
      buildApp({
        createDeliveryUseCase: useCases.createDeliveryUseCase,
      } as unknown as Parameters<typeof buildApp>[0]);
    }).toThrow('Pass delivery use cases as one deliveryUseCases object');
  });

  it('rejects incomplete delivery use case groups', () => {
    const useCases = buildDeliveryUseCases();

    expect(() => {
      buildApp({
        deliveryUseCases: {
          createDeliveryUseCase: useCases.createDeliveryUseCase,
        },
      } as unknown as Parameters<typeof buildApp>[0]);
    }).toThrow(
      'deliveryUseCases must include createDeliveryUseCase, getDeliveryStatusUseCase, and handleTlsWebhookUseCase',
    );
  });
});
