import { Readable } from 'stream';

import type { BotService } from '../../api';
import type { RawPhotoSize } from '../raw-update.types';
import { DownloadOptions, TelegramFile } from './telegram-file';

const area = (size: RawPhotoSize): number => size.width * size.height;

/**
 * A photo — Telegram delivers it as several `PhotoSize`s (different qualities).
 * `largest`/`smallest` pick a size to download; `save`/`stream`/`buffer`
 * default to the largest, which is what you almost always want.
 */
export class Photo {
  constructor(
    private readonly bot: BotService,
    readonly sizes: RawPhotoSize[],
  ) {}

  /** The highest-resolution size, as a downloadable file. */
  get largest(): TelegramFile {
    return this.fileOf(
      this.sizes.reduce((best, size) =>
        area(size) > area(best) ? size : best,
      ),
    );
  }

  /** The lowest-resolution size (e.g. a thumbnail), as a downloadable file. */
  get smallest(): TelegramFile {
    return this.fileOf(
      this.sizes.reduce((best, size) =>
        area(size) < area(best) ? size : best,
      ),
    );
  }

  save(destinationPath: string, options?: DownloadOptions): Promise<void> {
    return this.largest.save(destinationPath, options);
  }

  stream(options?: DownloadOptions): Promise<Readable> {
    return this.largest.stream(options);
  }

  buffer(options?: DownloadOptions): Promise<Buffer> {
    return this.largest.buffer(options);
  }

  private fileOf(size: RawPhotoSize): TelegramFile {
    return new TelegramFile(this.bot, size);
  }
}
