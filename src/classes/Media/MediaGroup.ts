import { InputSupportedMedia } from '../../types';
import { Media } from './Media';

export class MediaGroup extends Media {
  mediaGroup: InputSupportedMedia[];

  /**
   * Creates media group
   * @param mediaGroup Group content
   * */
  constructor(...mediaGroup: InputSupportedMedia[]) {
    super('path', '');
    this.mediaGroup = mediaGroup;
  }
}
