import { Media } from './Media';
import { MediaFileTypes } from '../../types';

export class Photo extends Media {
  fileType: MediaFileTypes = 'photo';
}
