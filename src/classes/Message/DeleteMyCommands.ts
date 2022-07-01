import { MessageCreator } from './MessageCreator';
import { BotCommandScope, MessageCreatorTypes, SendTypes } from '../../types';

export class DeleteMyCommands extends MessageCreator {
  sendType: SendTypes = 'deleteMyCommands';
  type: MessageCreatorTypes = 'text';

  /**
   * Delete my commands
   * @param scope Optional. Scope for which you want to delete commands. {@link BotCommandScope}
   * @param languageCode Optional. A two-letter ISO 639-1 language code. If empty, commands will be applied to all users from the given scope, for whose language there are no dedicated commands
   * @see https://core.telegram.org/bots/api#deletemycommands
   * */
  constructor(public readonly scope?: BotCommandScope, public readonly languageCode?: string) {
    super({});
  }
}
