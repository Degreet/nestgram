import { Media } from './Media';
import { ISendVenueOptions } from '../../types';

export class Venue extends Media {
  /**
   * Send venue
   * @param latitude Latitude of the location
   * @param longitude Longitude of the location
   * @param title Venue title
   * @param address Venue address
   * @param options Message options {@link ISendVenueOptions}
   * @see https://core.telegram.org/bots/api#sendvenue
   * */
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly title: string,
    public readonly address: string,
    public readonly options: ISendVenueOptions = {},
  ) {
    super('path', 'none', options);
  }
}
