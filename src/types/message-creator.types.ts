import { MediaFileTypes } from './media.types';

export type SendTypes =
  | 'send'
  | 'alert'
  | 'toast'
  | 'forward'
  | 'copy'
  | 'chatAction'
  | 'ban'
  | 'unban'
  | 'restrict'
  | 'promote'
  | 'adminTitle'
  | 'saveFile'
  | 'saveProfilePhoto';

export type MessageCreatorTypes = MediaFileTypes | 'text' | 'location';
