import { ReadStream } from 'fs';
import { basename } from 'path';
import { readFile } from 'fs/promises';

/**
 * A local file to upload to Telegram. Pass a path or a `ReadStream` as any
 * file field (`photo`, `document`, a media item's `media`, …) and the request
 * is sent as `multipart/form-data` automatically. Use a `file_id`/URL string
 * instead to reuse or link a remote file without uploading.
 *
 * ```ts
 * message.answerPhoto(new InputFile('./cat.jpg'));
 * ```
 */
export class InputFile {
  constructor(readonly file: string | ReadStream, readonly filename?: string) {
    if (!filename && typeof file === 'string') {
      this.filename = basename(file);
    }
  }

  async toRaw() {
    const file = this.file;
    if (typeof file === 'string') {
      return new Blob([await readFile(file)], { type: 'image/jpeg' });
    }
    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    return new Blob([buffer]);
  }
}
