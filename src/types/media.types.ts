import { ParseModes } from './api.types';
import { IMessageEntity } from './update.types';
import { Audio, Document, Photo, Video } from '../classes';

export type MediaFileTypes =
  | 'photo'
  | 'video'
  | 'thumb'
  | 'audio'
  | 'document'
  | 'animation'
  | 'voice'
  | 'video_note';

export type MediaSendTypes = 'location' | 'venue' | 'contact' | 'poll' | 'dice';

export type InputMediaTypes =
  | IInputMediaAnimation
  | IInputMediaAudio
  | IInputMediaDocument
  | IInputMediaPhoto
  | IInputMediaVideo;

export type InputSupportedMedia = Audio | Document | Photo | Video;
export type InputAllSupportedMedia = Animation | InputSupportedMedia;
export type MediaPassTypes = 'url' | 'path';

export interface IResolution {
  width?: number;
  height?: number;
}

export interface IInputMediaDefault {
  type: 'animation' | 'audio' | 'video' | 'photo' | 'document';
  media: string;
  caption?: string;
  parse_mode?: ParseModes;
  caption_entities?: IMessageEntity[];
}

export interface IInputMediaAnimation extends IInputMediaDefault {
  type: 'animation';
  thumb?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface IInputMediaAudio extends IInputMediaDefault {
  type: 'audio';
  thumb?: string;
  duration?: number;
  performer?: string;
  title?: string;
}

export interface IInputMediaDocument extends IInputMediaDefault {
  type: 'document';
  thumb?: string;
}

export interface IInputMediaPhoto extends IInputMediaDefault {
  type: 'photo';
}

export interface IInputMediaVideo extends IInputMediaDefault {
  type: 'video';
  thumb?: string;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}
