import { FactoryProvider } from '@nestjs/common';

import { KeyValueStore } from '../store/key-value-store';
import { RateLimitModule } from './rate-limit.module';
import { RateLimitOptions, RATE_LIMIT_STORE } from './rate-limit.types';

/**
 * Build the store the module would inject under {@link RATE_LIMIT_STORE} for a
 * given options object, by invoking that provider's factory directly — no full
 * Nest bootstrap needed to assert the `idleTtlMs` wiring.
 */
function storeFor(options: RateLimitOptions): KeyValueStore {
  const dynamic = RateLimitModule.forRoot(options);
  const storeProvider = (dynamic.providers ?? []).find(
    (p): p is FactoryProvider =>
      typeof p === 'object' && 'provide' in p && p.provide === RATE_LIMIT_STORE,
  );
  if (!storeProvider) {
    throw new Error('RATE_LIMIT_STORE provider not found');
  }
  // The factory injects the resolved options (the value provider in forRoot).
  return storeProvider.useFactory(options) as KeyValueStore;
}

describe('RateLimitModule store wiring', () => {
  it('passes idleTtlMs to the default MemoryStore — a key is forgotten after going idle', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(0);
      const idleTtlMs = 1_000;
      const store = storeFor({ idleTtlMs });

      store.set('k', { hits: [0] });
      expect(store.get('k')).toEqual({ hits: [0] }); // still within the TTL

      jest.setSystemTime(idleTtlMs + 1); // idle past the TTL
      expect(store.get('k')).toBeUndefined(); // evicted
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps keys indefinitely when idleTtlMs is unset', () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(0);
      const store = storeFor({});

      store.set('k', { hits: [0] });
      jest.setSystemTime(60 * 60 * 1000); // an hour later
      expect(store.get('k')).toEqual({ hits: [0] }); // never evicted
    } finally {
      jest.useRealTimers();
    }
  });
});
