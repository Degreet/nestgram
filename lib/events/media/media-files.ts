import { TelegramFile } from './telegram-file';

/**
 * Single-file media types. Each is a {@link TelegramFile} (so it has
 * `save`/`stream`/`buffer`) plus the Bot API metadata for that kind — the
 * fields are populated by the base constructor's `Object.assign`.
 */

export class Document extends TelegramFile {
  file_name?: string;
  mime_type?: string;
}

export class Video extends TelegramFile {
  width!: number;
  height!: number;
  duration!: number;
  file_name?: string;
  mime_type?: string;
}

export class Animation extends TelegramFile {
  width!: number;
  height!: number;
  duration!: number;
  file_name?: string;
  mime_type?: string;
}

export class Audio extends TelegramFile {
  duration!: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
}

export class Voice extends TelegramFile {
  duration!: number;
  mime_type?: string;
}

export class VideoNote extends TelegramFile {
  length!: number;
  duration!: number;
}

export class Sticker extends TelegramFile {
  width!: number;
  height!: number;
  emoji?: string;
  set_name?: string;
}
