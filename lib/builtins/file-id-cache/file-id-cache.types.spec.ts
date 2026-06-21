import { MemoryStore, KeyValueStore } from '../../store';
import {
  defaultFileIdCacheKey,
  resolveFileIdCacheSettings,
} from './file-id-cache.types';

describe('resolveFileIdCacheSettings', () => {
  it('fills defaults when no options are given (in-memory store, default key)', () => {
    const settings = resolveFileIdCacheSettings(undefined, 'bot');
    expect(settings.store).toBeInstanceOf(MemoryStore);
    expect(settings.botName).toBe('bot');
    expect(settings.key).toBe(defaultFileIdCacheKey);
  });

  it('uses a supplied store and key override', () => {
    const store: KeyValueStore = new MemoryStore();
    const key = (): string => 'custom';
    const settings = resolveFileIdCacheSettings({ store, key }, 'bot');
    expect(settings.store).toBe(store);
    expect(settings.key).toBe(key);
  });
});

describe('defaultFileIdCacheKey', () => {
  it('is scoped by bot and method so ids never cross-contaminate', () => {
    expect(
      defaultFileIdCacheKey({
        botName: 'bot',
        method: 'sendPhoto',
        field: 'photo',
        source: '/logo.png',
      }),
    ).toBe('nbot:sendPhoto:/logo.png');

    // Same file, different method → different key (photo id ≠ document id).
    expect(
      defaultFileIdCacheKey({
        botName: 'bot',
        method: 'sendDocument',
        field: 'document',
        source: '/logo.png',
      }),
    ).toBe('nbot:sendDocument:/logo.png');
  });
});
