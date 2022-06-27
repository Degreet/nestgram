import { MediaFileTypes } from './media.types';

export type SendTypes = 'send' | 'alert' | 'toast' | 'forward' | 'copy' | 'chatAction' | 'ban';
export type MessageCreatorTypes = MediaFileTypes | 'text' | 'location';
