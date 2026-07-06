import { describe, expect, it } from 'vitest';
import { resolvePollingIntervalMs } from '../src/infrastructure/polling/nrw-polling-job.js';

describe('resolvePollingIntervalMs', () => {
  it('uses the default interval when POLLING_INTERVAL_MS is not configured', () => {
    expect(resolvePollingIntervalMs({})).toBe(60000);
    expect(resolvePollingIntervalMs({ POLLING_INTERVAL_MS: '   ' })).toBe(60000);
  });

  it('accepts positive integer intervals', () => {
    expect(resolvePollingIntervalMs({ POLLING_INTERVAL_MS: '120000' })).toBe(120000);
  });

  it('rejects non-positive or fractional intervals', () => {
    expect(() => resolvePollingIntervalMs({ POLLING_INTERVAL_MS: '0' })).toThrow(
      'POLLING_INTERVAL_MS must be a positive integer',
    );
    expect(() => resolvePollingIntervalMs({ POLLING_INTERVAL_MS: '0.5' })).toThrow(
      'POLLING_INTERVAL_MS must be a positive integer',
    );
    expect(() => resolvePollingIntervalMs({ POLLING_INTERVAL_MS: 'abc' })).toThrow(
      'POLLING_INTERVAL_MS must be a positive integer',
    );
  });
});
