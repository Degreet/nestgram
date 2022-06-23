import { ISendLocationOptions, MediaSendTypes } from '../../types';
import { Media } from './Media';

export class Location extends Media {
  type: MediaSendTypes = 'location';

  /**
   * Send location
   * @param latitude Latitude of the location
   * @param longitude Longitude of the location
   * @param options Message options {@link ISendLocationOptions}
   * @see https://core.telegram.org/bots/api#sendlocation
   * */
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly options: ISendLocationOptions = {},
  ) {
    super('path', 'none', options);
  }
}
