import { InputFile } from './input-file';

/**
 * Media items for albums and editable media (`sendMediaGroup`,
 * `editMessageMedia`). Each is discriminated by `type`; `media` (and any
 * `thumbnail`/`cover`) takes a `file_id`/URL string or an {@link InputFile} to
 * upload. Hand-written so `media` accepts `InputFile` directly — the generated
 * `Raw*` wire types model it as a bare string.
 *
 * @see https://core.telegram.org/bots/api#inputmedia
 */
export interface InputMediaAudio {
  type: 'audio';
  media: string | InputFile;
  thumbnail?: string | InputFile;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  duration?: number;
  performer?: string;
  title?: string;
}

export interface InputMediaDocument {
  type: 'document';
  media: string | InputFile;
  thumbnail?: string | InputFile;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  disable_content_type_detection?: boolean;
}

export interface InputMediaPhoto {
  type: 'photo';
  media: string | InputFile;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
}

export interface InputMediaVideo {
  type: 'video';
  media: string | InputFile;
  thumbnail?: string | InputFile;
  cover?: string | InputFile;
  start_timestamp?: number;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  show_caption_above_media?: boolean;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
  has_spoiler?: boolean;
}

export interface InputMediaAnimation {
  type: 'animation';
  media: string | InputFile;
  thumbnail?: string | InputFile;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  show_caption_above_media?: boolean;
  width?: number;
  height?: number;
  duration?: number;
  has_spoiler?: boolean;
}

export interface InputMediaLivePhoto {
  type: 'live_photo';
  media: string | InputFile;
  photo: string | InputFile;
  caption?: string;
  parse_mode?: string;
  caption_entities?: any[];
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
}
