import { Media } from './Media';
import { MediaFileTypes } from '../../types';

export class Voice extends Media {
  type: MediaFileTypes = 'voice';
}
