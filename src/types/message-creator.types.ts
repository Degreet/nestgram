import { MediaFileTypes } from './media.types';

export type SendTypes = 'send' | 'alert' | 'toast' | 'forward' | 'copy';
export type MessageCreatorTypes = MediaFileTypes | 'text' | 'location';
