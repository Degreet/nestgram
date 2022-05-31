import { MediaFileTypes, MediaPassTypes } from '../../types';

export class Media {
  fileType: MediaFileTypes;

  /**
   * Creates media content (e.g. photo, video, document)
   * @param passType Type how you want to pass media file, url or path
   * @param media Media that you want to send, url or path to a file
   * */
  constructor(public readonly passType: MediaPassTypes, public media: string) {}
}
