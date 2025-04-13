import { ReadStream } from 'fs';
import { basename } from 'path';
import { readFile } from 'fs/promises';

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
