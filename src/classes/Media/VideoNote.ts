import { Media } from './Media';
import { MediaFileTypes } from '../../types';

export class VideoNote extends Media {
  type: MediaFileTypes = 'video_note';
}
