import type { Readable } from 'stream';

import type { BotService } from '../../api';
import type { RawFileBase } from '../raw-update.types';

/** Per-download controls. */
export interface DownloadOptions {
  /** Abort the in-flight download. */
  signal?: AbortSignal;
}

/**
 * A downloadable Telegram file (the base for `Photo` sizes, `Video`, `Document`,
 * …). Holds the `file_id` and exposes the download actions as sugar over the
 * `BotService` file methods, where the actual logic lives — so resolving a link
 * or streaming bytes works the same whether you start from a rich event or a
 * raw `file_id` (`bot.download(fileId, path)`).
 */
export class TelegramFile {
  file_id!: string;
  file_unique_id!: string;
  file_size?: number;

  constructor(protected readonly bot: BotService, raw: RawFileBase) {
    Object.assign(this, raw);
  }

  /** Resolve a fresh, temporary download URL for this file. */
  getLink(signal?: AbortSignal): Promise<string> {
    return this.bot.fileLink(this.file_id, { signal });
  }

  /** Open the file as a readable stream (preferred for large files). */
  stream(options?: DownloadOptions): Promise<Readable> {
    return this.bot.fileStream(this.file_id, options);
  }

  /** Read the whole file into a Buffer. */
  buffer(options?: DownloadOptions): Promise<Buffer> {
    return this.bot.fileBuffer(this.file_id, options);
  }

  /** Stream the file to a local path. */
  save(destinationPath: string, options?: DownloadOptions): Promise<void> {
    return this.bot.download(this.file_id, destinationPath, options);
  }
}
