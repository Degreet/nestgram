import { MediaFileTypes, MediaPassTypes, MediaSendTypes } from '../../types';
import { Thumb } from './Thumb';

export class Media {
  type: MediaFileTypes | MediaSendTypes;
  thumb?: Thumb;

  /**
   * Creates media content (e.g. photo, video, document)
   * @param passType Type how you want to pass media file, url or path
   * @param media Media that you want to send, url or path to a file
   * @param options Options for MediaGroup
   * */
  constructor(
    public readonly passType: MediaPassTypes,
    public media: string,
    public readonly options?: any,
  ) {}

  /**
   * Set thumb for file
   * @param thumb Thumb image that you want to set {@link Thumb}
   * */
  setThumb(thumb: Thumb): this {
    this.thumb = thumb;
    return this;
  }
}
