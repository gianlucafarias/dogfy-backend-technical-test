import { DomainValidationError } from './domain-errors.js';
import { requireNonEmptyString, requireRecord } from './validation.js';

export type Label = {
  format: 'text';
  content: string;
};

export function normalizeLabel(input: unknown): Label {
  const label = requireRecord(input, 'label');
  const format = requireNonEmptyString(label.format, 'label.format');

  if (format !== 'text') {
    throw new DomainValidationError('label.format must be text');
  }

  return {
    format,
    content: requireNonEmptyString(label.content, 'label.content'),
  };
}
