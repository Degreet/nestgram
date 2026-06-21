import { lastValueFrom, of } from 'rxjs';

import { FileIdCacheInterceptor } from './file-id-cache.interceptor';
import {
  defaultFileIdCacheKey,
  FileIdCacheSettings,
} from './file-id-cache.types';
import { InputFile } from '../../api/input-file';
import { CachedFile } from '../../api/cached-file';
import { ApiExecutionContext } from '../../api/request';
import { ApiMethod } from '../../api/methods';

/** A store that records every write, for asserting cache hits/misses. */
function fakeStore() {
  const saved = new Map<string, string>();
  const store = {
    get: (key: string): string | undefined => saved.get(key),
    set: (key: string, value: unknown): void => {
      saved.set(key, value as string);
    },
    delete: (key: string): void => {
      saved.delete(key);
    },
  };
  return { store, saved };
}

function settingsWith(
  store: FileIdCacheSettings['store'],
): FileIdCacheSettings {
  return { store, botName: 'bot', key: defaultFileIdCacheKey };
}

function context(
  method: string,
  payload: Record<string, unknown>,
  isMedia = true,
) {
  const request = { method, payload, token: 'T' };
  // Media method classes expose a `hasMedia` accessor; the interceptor gates on
  // its presence, so the fake mirrors that.
  const command = isMedia ? { method, hasMedia: false } : { method };
  const ctx: ApiExecutionContext = {
    getRequest: () => request,
    getMethod: () => command as unknown as ApiMethod<unknown, unknown>,
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
  return { ctx, request };
}

async function send(
  interceptor: FileIdCacheInterceptor,
  ctx: ApiExecutionContext,
  result: unknown,
): Promise<unknown> {
  const observable = await interceptor.intercept(ctx, {
    handle: () => of(result),
  });
  return lastValueFrom(observable);
}

describe('FileIdCacheInterceptor', () => {
  it('leaves a plain (uncached) InputFile alone', async () => {
    const { store, saved } = fakeStore();
    const interceptor = new FileIdCacheInterceptor(settingsWith(store));
    const { ctx, request } = context('sendDocument', {
      chat_id: 1,
      document: new InputFile('/x/report.pdf'), // not a CachedFile
    });

    await send(interceptor, ctx, { document: { file_id: 'DOC1' } });

    expect(saved.size).toBe(0);
    expect(request.payload.document).toBeInstanceOf(InputFile);
  });

  it('skips a non-media method without scanning the payload', async () => {
    const { store, saved } = fakeStore();
    const interceptor = new FileIdCacheInterceptor(settingsWith(store));
    // sendMessage exposes no `hasMedia` accessor — the gate short-circuits.
    const { ctx } = context('sendMessage', { chat_id: 1, text: 'hi' }, false);

    const result = await send(interceptor, ctx, { message_id: 7 });

    expect(result).toEqual({ message_id: 7 });
    expect(saved.size).toBe(0);
  });

  describe('miss (a CachedFile)', () => {
    it('uploads and caches the returned file_id under bot:method:source', async () => {
      const { store, saved } = fakeStore();
      const interceptor = new FileIdCacheInterceptor(settingsWith(store));
      const { ctx, request } = context('sendDocument', {
        chat_id: 1,
        document: new CachedFile('/x/report.pdf'),
      });

      await send(interceptor, ctx, { document: { file_id: 'DOC1' } });

      // The file stayed an upload (payload not rewritten).
      expect(request.payload.document).toBeInstanceOf(InputFile);
      expect(saved.get('nbot:sendDocument:/x/report.pdf')).toBe('DOC1');
    });

    it('picks the largest size for a photo (rich Photo wrapper)', async () => {
      const { store, saved } = fakeStore();
      const interceptor = new FileIdCacheInterceptor(settingsWith(store));
      const { ctx } = context('sendPhoto', {
        chat_id: 1,
        photo: new CachedFile('/p.jpg'),
      });

      await send(interceptor, ctx, {
        photo: {
          sizes: [
            { file_id: 'small', width: 1, height: 1 },
            { file_id: 'big', width: 10, height: 10 },
          ],
        },
      });

      expect(saved.get('nbot:sendPhoto:/p.jpg')).toBe('big');
    });

    it('picks the largest size for a raw PhotoSize array', async () => {
      const { store, saved } = fakeStore();
      const interceptor = new FileIdCacheInterceptor(settingsWith(store));
      const { ctx } = context('sendPhoto', {
        chat_id: 1,
        photo: new CachedFile('/p.jpg'),
      });

      await send(interceptor, ctx, {
        photo: [
          { file_id: 'a', width: 1, height: 1 },
          { file_id: 'b', width: 5, height: 5 },
        ],
      });

      expect(saved.get('nbot:sendPhoto:/p.jpg')).toBe('b');
    });

    it('caches only the primary file, never a thumbnail', async () => {
      const { store, saved } = fakeStore();
      const interceptor = new FileIdCacheInterceptor(settingsWith(store));
      const { ctx } = context('sendVideo', {
        chat_id: 1,
        video: new CachedFile('/v.mp4'),
        thumbnail: new CachedFile('/t.jpg'),
      });

      await send(interceptor, ctx, { video: { file_id: 'V' } });

      expect(saved.get('nbot:sendVideo:/v.mp4')).toBe('V');
      expect(saved.has('nbot:sendVideo:/t.jpg')).toBe(false);
    });
  });

  describe('hit', () => {
    it('rewrites the payload to the cached file_id string and does not re-upload', async () => {
      const { store, saved } = fakeStore();
      saved.set('nbot:sendPhoto:/logo.png', 'CACHED');
      const interceptor = new FileIdCacheInterceptor(settingsWith(store));
      const { ctx, request } = context('sendPhoto', {
        chat_id: 1,
        photo: new CachedFile('/logo.png'),
      });

      await send(interceptor, ctx, {
        photo: { sizes: [{ file_id: 'NEW', width: 1, height: 1 }] },
      });

      // The upload is replaced by the bare file_id string.
      expect(request.payload.photo).toBe('CACHED');
      // The cache is not overwritten on a hit.
      expect(saved.get('nbot:sendPhoto:/logo.png')).toBe('CACHED');
    });
  });
});
