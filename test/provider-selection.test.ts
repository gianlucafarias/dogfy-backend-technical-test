import { describe, expect, it } from 'vitest';
import { selectProviderForOrder } from '../src/application/provider-selection.js';

describe('provider selection', () => {
  it('selects NRW for the documented demo order reference', () => {
    expect(selectProviderForOrder('DEMO-NRW-002')).toBe('NRW');
  });

  it('selects TLS for the documented demo order reference', () => {
    expect(selectProviderForOrder('DEMO-TLS-001')).toBe('TLS');
  });
});
