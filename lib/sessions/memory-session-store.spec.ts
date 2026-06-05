import { MemorySessionStore } from './memory-session-store';

describe('MemorySessionStore', () => {
  it('stores and retrieves a value', () => {
    const store = new MemorySessionStore();
    store.set('k', { n: 1 });
    expect(store.get('k')).toEqual({ n: 1 });
  });

  it('returns undefined for a missing key', () => {
    expect(new MemorySessionStore().get('nope')).toBeUndefined();
  });

  it('deletes a value', () => {
    const store = new MemorySessionStore();
    store.set('k', 1);
    store.delete('k');
    expect(store.get('k')).toBeUndefined();
  });

  it('expires entries past their TTL', () => {
    jest.useFakeTimers();
    try {
      const store = new MemorySessionStore(1000);
      store.set('k', 'v');
      expect(store.get('k')).toBe('v');
      jest.advanceTimersByTime(1001);
      expect(store.get('k')).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
