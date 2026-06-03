import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import type { BotService } from '../../api';
import { NestgramError } from '../../exceptions';
import type { RawFileBase } from '../raw-update.types';

const TELEGRAM_FILE_BASE = 'https://api.telegram.org/file';

/** Per-download controls. */
export interface DownloadOptions {
  /** Abort the in-flight download. */
  signal?: AbortSignal;
}

/**
 * A downloadable Telegram file (the base for `Photo` sizes, `Video`, `Document`,
 * …). Holds the `file_id` and knows how to resolve a fresh download link and
 * stream the bytes.
 *
 * Telegram's `file_path` is temporary, so every download re-resolves it via
 * `getFile` — there's no stale-link window. Files larger than the Bot API's
 * ~20 MB download limit make `getFile` itself fail; that surfaces as the API
 * error, not a silent truncation.
 */
export class TelegramFile {
  file_id!: string;
  file_unique_id!: string;
  file_size?: number;

  constructor(protected readonly bot: BotService, raw: RawFileBase) {
    Object.assign(this, raw);
  }

  /** Resolve a fresh, temporary download URL for this file. */
  async getLink(signal?: AbortSignal): Promise<string> {
    const file = await this.bot.getFile(this.file_id, { signal });
    if (!file.file_path) {
      throw new NestgramError(
        `getFile returned no file_path for "${this.file_id}" (file may be too large to download)`,
      );
    }
    return `${TELEGRAM_FILE_BASE}/bot${this.bot.token}/${file.file_path}`;
  }

  /** Open the file as a readable stream (preferred for large files). */
  async download(options?: DownloadOptions): Promise<Readable> {
    const response = await this.fetchFile(options?.signal);
    if (!response.body) {
      throw new NestgramError(`Empty download body for "${this.file_id}"`);
    }
    return Readable.fromWeb(
      response.body as Parameters<typeof Readable.fromWeb>[0],
    );
  }

  /** Read the whole file into a Buffer. */
  async buffer(options?: DownloadOptions): Promise<Buffer> {
    const response = await this.fetchFile(options?.signal);
    return Buffer.from(await response.arrayBuffer());
  }

  /** Stream the file to a local path. */
  async save(
    destinationPath: string,
    options?: DownloadOptions,
  ): Promise<void> {
    const stream = await this.download(options);
    try {
      await pipeline(stream, createWriteStream(destinationPath));
    } catch (error) {
      // Don't leave a truncated file behind if the download fails mid-stream.
      await rm(destinationPath, { force: true });
      throw error;
    }
  }

  private async fetchFile(signal?: AbortSignal): Promise<Response> {
    const link = await this.getLink(signal);
    const response = await fetch(link, { signal });
    if (!response.ok) {
      throw new NestgramError(
        `Failed to download "${this.file_id}": ${response.status} ${response.statusText}`,
      );
    }
    return response;
  }
}
