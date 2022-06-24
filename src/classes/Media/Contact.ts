import { Media } from './Media';
import { ISendContactOptions } from '../../types';

export class Contact extends Media {
  /**
   * Send contact
   * @param phone Contact phone
   * @param firstName Contact first name
   * @param lastName Contact last name (optional)
   * @param options Message options {@link ISendContactOptions}
   * @see https://core.telegram.org/bots/api#sendcontact
   * */
  constructor(
    public readonly phone: string,
    public readonly firstName: string,
    public readonly lastName: string | null = null,
    public readonly options: ISendContactOptions = {},
  ) {
    super('path', 'none', options);
  }
}
