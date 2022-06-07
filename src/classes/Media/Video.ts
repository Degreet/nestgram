import { Media } from './Media';
import { MediaFileTypes } from '../../types';

export class Video extends Media {
  fileType: MediaFileTypes = 'video';
}
