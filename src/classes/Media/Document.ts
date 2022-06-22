import { Media } from './Media';
import { MediaFileTypes } from '../../types';

export class Document extends Media {
  type: MediaFileTypes = 'document';
}
