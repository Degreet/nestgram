import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class AdminTitle extends MessageCreator {
  sendType: SendTypes = 'adminTitle';
  type: MessageCreatorTypes = 'text';

  /**
   * Set admin custom title
   * @param title Admin custom title (status, post, job title. 0-16 characters, emoji are not allowed)
   * @param userId User id you want to set a custom title for
   * @see https://core.telegram.org/bots/api#setchatadministratorcustomtitle
   * */
  constructor(public readonly title: string, public readonly userId?: number) {
    super({});
  }
}
