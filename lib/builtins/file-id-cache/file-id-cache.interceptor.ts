import { Inject, Injectable, Logger } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../../api/request';
import { InputFile } from '../../api/input-file';
import { KeyValueStore } from '../../store';
import {
  FILE_ID_CACHE_SETTINGS,
  FileIdCacheSettings,
} from './file-id-cache.types';

/**
 * Reuses a Telegram `file_id` across sends of the same file. On the first send
 * of a local/URL file the upload happens normally; the returned `file_id` is
 * cached, and later sends of the same source go out as that `file_id` — no bytes
 * re-uploaded, no URL re-fetched. A big win for static media (logos, repeated
 * photos).
 *
 * An ordinary {@link ApiInterceptor} sitting just before the throttler (so a
 * cache hit that turns an upload into a `file_id` send still throttles) — no
 * privileged core. It only acts on a `new CachedFile(path)` source; every other
 * send passes through, so the cache is opt-in per file with no global switch.
 *
 * Scope: a single primary media file per send (`sendPhoto`, `sendVideo`,
 * `sendDocument`, …). Albums (`sendMediaGroup`) and secondary files
 * (`thumbnail`/`cover`, whose `file_id` Telegram doesn't echo) are not cached.
 */
@Injectable()
export class FileIdCacheInterceptor implements ApiInterceptor {
  /** Secondary file fields whose `file_id` Telegram doesn't return — never cache these. */
  private static readonly SECONDARY_FIELDS: ReadonlySet<string> = new Set([
    'thumbnail',
    'cover',
  ]);

  /**
   * The accessor only media-capable method classes (`sendPhoto`, `sendVideo`, …)
   * carry — the cheap O(1) gate that lets every non-media send (text, edits,
   * callbacks) skip the payload scan. Checked with `in` so it never invokes the
   * getter.
   */
  private static readonly MEDIA_METHOD_MARKER = 'hasMedia';

  private readonly logger = new Logger(FileIdCacheInterceptor.name);

  constructor(
    @Inject(FILE_ID_CACHE_SETTINGS)
    private readonly settings: FileIdCacheSettings,
  ) {}

  async intercept(
    context: ApiExecutionContext,
    next: ApiCallHandler,
  ): Promise<Observable<unknown>> {
    const method = context.getMethod();
    // Only a media-capable method can carry a cacheable file — skip the payload
    // scan for everything else (the common case pays nothing).
    if (!(FileIdCacheInterceptor.MEDIA_METHOD_MARKER in method)) {
      return next.handle();
    }

    const settings = this.settings;
    const request = context.getRequest();
    const slot = this.cacheableSlot(request.payload);
    if (!slot || slot.file.cacheKey === undefined) {
      return next.handle();
    }

    const key = settings.key({
      botName: settings.botName,
      method: method.method,
      field: slot.field,
      source: slot.file.cacheKey,
    });
    if (key === undefined) {
      return next.handle();
    }

    const cached = await settings.store.get(key);
    if (typeof cached === 'string') {
      // Hit: swap the upload for the cached file_id (a bare string Telegram
      // resolves), so the bytes are never read or re-uploaded.
      request.payload[slot.field] = cached;
      return next.handle();
    }

    // Miss: let it upload, then remember the returned file_id for next time.
    return next.handle().pipe(
      tap((result) => {
        const fileId = this.extractFileId(result, slot.field);
        if (fileId !== undefined) {
          void this.persist(settings.store, key, fileId);
        }
      }),
    );
  }

  /** The first top-level payload field carrying a cacheable file, if any. */
  private cacheableSlot(
    payload: Record<string, unknown>,
  ): { field: string; file: InputFile } | undefined {
    for (const [field, value] of Object.entries(payload)) {
      if (FileIdCacheInterceptor.SECONDARY_FIELDS.has(field)) {
        continue;
      }
      if (value instanceof InputFile && value.cacheKey !== undefined) {
        return { field, file: value };
      }
    }
    return undefined;
  }

  /** Pull the just-sent file's `file_id` out of the result message. */
  private extractFileId(result: unknown, field: string): string | undefined {
    if (result === null || typeof result !== 'object') {
      return undefined;
    }
    const media = (result as Record<string, unknown>)[field];
    if (media === null || typeof media !== 'object') {
      return undefined;
    }
    // A photo is several sizes — a raw `PhotoSize[]` or the rich `Photo`
    // wrapper's `sizes`. Cache the highest-resolution size's id.
    const sizes = Array.isArray(media)
      ? media
      : (media as { sizes?: unknown }).sizes;
    if (Array.isArray(sizes)) {
      return this.largestFileId(sizes);
    }
    const fileId = (media as { file_id?: unknown }).file_id;
    return typeof fileId === 'string' ? fileId : undefined;
  }

  private largestFileId(sizes: unknown[]): string | undefined {
    let best:
      | { file_id?: unknown; width?: number; height?: number }
      | undefined;
    for (const size of sizes) {
      if (size === null || typeof size !== 'object') {
        continue;
      }
      const candidate = size as {
        file_id?: unknown;
        width?: number;
        height?: number;
      };
      if (best === undefined || this.area(candidate) > this.area(best)) {
        best = candidate;
      }
    }
    return best !== undefined && typeof best.file_id === 'string'
      ? best.file_id
      : undefined;
  }

  private area(size: { width?: number; height?: number }): number {
    return (size.width ?? 0) * (size.height ?? 0);
  }

  /** Best-effort store write — a cache failure must never break the send. */
  private async persist(
    store: KeyValueStore,
    key: string,
    fileId: string,
  ): Promise<void> {
    try {
      await store.set(key, fileId);
    } catch (error) {
      this.logger.warn(
        `Could not cache a file_id — ${
          error instanceof Error ? error.message : String(error)
        }. The next send re-uploads instead.`,
      );
    }
  }
}
