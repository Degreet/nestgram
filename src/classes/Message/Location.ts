import { MessageCreator } from './MessageCreator';
import { ISendLocationOptions, SendTypes } from '../../types';

export class Location extends MessageCreator {
  sendType: SendTypes = 'location';

  /**
   * Alert on inline button click
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
    super(options);
  }
}
