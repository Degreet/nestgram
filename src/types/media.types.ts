export type MediaFileTypes =
  | 'photo'
  | 'video'
  | 'thumb'
  | 'audio'
  | 'document'
  | 'animation'
  | 'voice'
  | 'video_note';

export type MediaPassTypes = 'url' | 'path';

export interface IResolution {
  width?: number;
  height?: number;
}
