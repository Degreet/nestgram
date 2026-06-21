import { InputFile } from './input-file';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from './input-media';

/** A media item valid inside a Telegram album (`sendMediaGroup`). */
export type AlbumItem =
  | InputMediaAudio
  | InputMediaDocument
  | InputMediaPhoto
  | InputMediaVideo;

/** Per-item options — everything on an item except its `type` tag and `media` source. */
type PhotoOptions = Omit<InputMediaPhoto, 'type' | 'media'>;
type VideoOptions = Omit<InputMediaVideo, 'type' | 'media'>;
type AudioOptions = Omit<InputMediaAudio, 'type' | 'media'>;
type DocumentOptions = Omit<InputMediaDocument, 'type' | 'media'>;

/**
 * Fluent builder for a Telegram album (`sendMediaGroup`). Accumulate items with
 * `.photo()/.video()/.audio()/.document()`, then hand the builder straight to
 * `message.answerMediaGroup(...)` / `replyMediaGroup(...)`:
 *
 * ```ts
 * const album = new MediaGroup()
 *   .photo(new InputFile('a.jpg'), { caption: 'A' })
 *   .video('https://example.com/v.mp4');
 * message.answerMediaGroup(album);
 * ```
 *
 * Telegram only allows mixing photos and videos in one album; audio-only and
 * document-only albums are also valid. `JSON.stringify` and the multipart
 * serializer both call `toJSON()`, so the builder is accepted anywhere the raw
 * item array is.
 */
export class MediaGroup {
  private static readonly TYPE = {
    photo: 'photo',
    video: 'video',
    audio: 'audio',
    document: 'document',
  } as const;

  private readonly items: AlbumItem[] = [];

  photo(media: string | InputFile, options?: PhotoOptions): this {
    this.items.push({ type: MediaGroup.TYPE.photo, media, ...options });
    return this;
  }

  video(media: string | InputFile, options?: VideoOptions): this {
    this.items.push({ type: MediaGroup.TYPE.video, media, ...options });
    return this;
  }

  audio(media: string | InputFile, options?: AudioOptions): this {
    this.items.push({ type: MediaGroup.TYPE.audio, media, ...options });
    return this;
  }

  document(media: string | InputFile, options?: DocumentOptions): this {
    this.items.push({ type: MediaGroup.TYPE.document, media, ...options });
    return this;
  }

  /** Append already-built album items. */
  add(...items: AlbumItem[]): this {
    this.items.push(...items);
    return this;
  }

  /** Append one item per source value via a builder callback (dynamic albums). */
  each<T>(
    items: readonly T[],
    build: (group: this, item: T, index: number) => void,
  ): this {
    items.forEach((item, index) => build(this, item, index));
    return this;
  }

  /** How many items have accumulated so far. */
  get size(): number {
    return this.items.length;
  }

  /** The raw item array — passable anywhere `sendMediaGroup`'s `media` is. */
  toJSON(): AlbumItem[] {
    return [...this.items];
  }
}
