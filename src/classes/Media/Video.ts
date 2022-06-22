import { Media } from './Media';
import { IResolution, MediaFileTypes } from '../../types';

export class Video extends Media {
  type: MediaFileTypes = 'video';
  resolution: IResolution = { width: 1920, height: 1080 };

  /**
   * Configures video resolution
   * @param width Video width
   * @param height Video height
   * */
  setResolution(width?: number | null, height?: number | null): this {
    if (width) this.resolution.width = width;
    if (height) this.resolution.height = height;
    return this;
  }
}
