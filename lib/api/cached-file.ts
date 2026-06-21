import { InputFile, InputFileOptions } from './input-file';

/**
 * A local file whose Telegram `file_id` is reused after the first upload. Drop
 * it in wherever an upload goes and the `fileIdCache` does the rest — the first
 * send uploads the bytes, later sends of the same path go out as the cached
 * `file_id`:
 *
 * ```ts
 * message.answerPhoto(new CachedFile('./assets/logo.png'));
 * ```
 *
 * Path-only: a path is the one upload source with a stable identity to key on
 * (a stream is consumed once; a buffer's bytes have no durable name). Mark only
 * **static** files — the key is the path, so a changed file at the same path
 * keeps serving the old `file_id` until it expires.
 */
export class CachedFile extends InputFile {
  constructor(private readonly path: string, options?: InputFileOptions) {
    super(path, options);
  }

  get cacheKey(): string {
    return this.path;
  }
}
