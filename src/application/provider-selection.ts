import { providerCodes, type ProviderCode } from '../domain/provider.js';

export function hashOrderReference(orderReference: string): number {
  return [...orderReference.trim().toUpperCase()].reduce((sum, character) => {
    return sum + character.charCodeAt(0);
  }, 0);
}

export function selectProviderForOrder(
  orderReference: string,
  availableProviders: readonly ProviderCode[] = providerCodes,
): ProviderCode {
  if (availableProviders.length === 0) {
    throw new Error('At least one provider is required');
  }

  const index = hashOrderReference(orderReference) % availableProviders.length;

  return availableProviders[index];
}
