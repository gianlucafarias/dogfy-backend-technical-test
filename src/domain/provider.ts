export const providerCodes = ['NRW', 'TLS'] as const;

export type ProviderCode = (typeof providerCodes)[number];

export function isProviderCode(value: unknown): value is ProviderCode {
  return typeof value === 'string' && providerCodes.includes(value as ProviderCode);
}
