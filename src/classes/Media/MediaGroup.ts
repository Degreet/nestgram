import { InputSupportedMedia } from '../../types';
import { Media } from './Media';

export class MediaGroup extends Media {
  /**
   * Creates media group
   * @param mediaGroup group content
   * */
  constructor(public readonly mediaGroup: InputSupportedMedia[]) {
    super('path', '');
  }
}
