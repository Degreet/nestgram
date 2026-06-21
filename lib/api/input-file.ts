import { ReadStream } from 'fs';
import { basename, extname } from 'path';
import { readFile } from 'fs/promises';

/** How an upload's bytes are sourced. */
enum SourceKind {
  Path = 'path',
  Stream = 'stream',
  Buffer = 'buffer',
}

/** The three local upload sources, discriminated by `kind`. */
type InputSource =
  | { kind: SourceKind.Path; path: string }
  | { kind: SourceKind.Stream; stream: ReadStream }
  | { kind: SourceKind.Buffer; data: Buffer | Uint8Array };

/** Options for an upload. */
export interface InputFileOptions {
  /** Override the file name Telegram sees (inferred from the path/stream otherwise). */
  filename?: string;
  /** Override the MIME type (inferred from the file name otherwise). */
  contentType?: string;
}

/** Options for a buffer upload — a `filename` is required so Telegram can name the file. */
export interface BufferInputFileOptions extends InputFileOptions {
  filename: string;
}

/**
 * A local file to upload to Telegram. Only **local** sources are wrapped — a
 * remote URL or a `file_id` is just a string (Telegram resolves it), so you pass
 * those bare:
 *
 * ```ts
 * message.answerPhoto(new InputFile('./cat.jpg'));            // upload a path
 * message.answerPhoto(new InputFile(bytes, { filename: 'c.jpg' })); // a buffer
 * message.answerPhoto(new InputFile(createReadStream('./c.jpg')));  // a stream
 * message.answerPhoto('https://example.com/cat.jpg');          // remote URL
 * message.answerPhoto('AgACAgIAAx...');                        // file_id
 * ```
 *
 * Uploads always go out as `multipart/form-data`, with the file name and MIME
 * type inferred. To reuse a `file_id` after the first upload, use
 * {@link CachedFile} instead.
 */
export class InputFile {
  private static readonly DEFAULT_MIME = 'application/octet-stream';

  private static readonly MIME_BY_EXT: Readonly<Record<string, string>> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.oga': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.txt': 'text/plain',
  };

  /** The file name Telegram sees. */
  readonly filename?: string;
  private readonly contentType?: string;
  private readonly source: InputSource;

  constructor(path: string, options?: InputFileOptions);
  constructor(stream: ReadStream, options?: InputFileOptions);
  constructor(data: Buffer | Uint8Array, options: BufferInputFileOptions);
  constructor(
    source: string | ReadStream | Buffer | Uint8Array,
    options?: InputFileOptions,
  ) {
    if (typeof source === 'string') {
      this.source = { kind: SourceKind.Path, path: source };
      this.filename = options?.filename ?? basename(source);
    } else if (source instanceof ReadStream) {
      this.source = { kind: SourceKind.Stream, stream: source };
      this.filename = options?.filename ?? InputFile.streamFilename(source);
    } else {
      if (!options?.filename) {
        throw new Error(
          'A buffer upload needs a filename so Telegram can name the file: new InputFile(bytes, { filename }).',
        );
      }
      this.source = { kind: SourceKind.Buffer, data: source };
      this.filename = options.filename;
    }
    this.contentType =
      options?.contentType ??
      (this.filename ? InputFile.mimeFor(this.filename) : undefined);
  }

  /**
   * A stable identity for the file-id cache, or `undefined` when this file isn't
   * cached. The base never caches; {@link CachedFile} overrides this.
   */
  get cacheKey(): string | undefined {
    return undefined;
  }

  /** The uploadable bytes as a `Blob`. */
  async toRaw(): Promise<Blob> {
    const source = this.source;
    const options = this.contentType ? { type: this.contentType } : undefined;
    switch (source.kind) {
      case SourceKind.Path:
        return new Blob([await readFile(source.path)], options);
      case SourceKind.Buffer:
        return new Blob([source.data], options);
      case SourceKind.Stream: {
        const chunks: Buffer[] = [];
        for await (const chunk of source.stream) {
          chunks.push(chunk);
        }
        return new Blob([Buffer.concat(chunks)], options);
      }
    }
  }

  private static mimeFor(filename: string): string {
    const ext = extname(filename).toLowerCase();
    return InputFile.MIME_BY_EXT[ext] ?? InputFile.DEFAULT_MIME;
  }

  private static streamFilename(stream: ReadStream): string | undefined {
    return typeof stream.path === 'string' ? basename(stream.path) : undefined;
  }
}
