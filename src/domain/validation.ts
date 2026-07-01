import { DomainValidationError } from './domain-errors.js';

export function requireRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DomainValidationError(`${fieldName} must be an object`);
  }

  return value as Record<string, unknown>;
}

export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new DomainValidationError(`${fieldName} must be a string`);
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new DomainValidationError(`${fieldName} must not be empty`);
  }

  return trimmed;
}

export function optionalNonEmptyString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireNonEmptyString(value, fieldName);
}

export function requirePositiveNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new DomainValidationError(`${fieldName} must be a positive number`);
  }

  return value;
}
