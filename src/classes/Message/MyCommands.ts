import { MessageCreator } from './MessageCreator';
import { BotCommandScope, IBotCommand, MessageCreatorTypes, SendTypes } from '../../types';

export class MyCommands extends MessageCreator {
  sendType: SendTypes = 'setMyCommands';
  type: MessageCreatorTypes = 'text';

  /**
   * Set my commands
   * @param commands Commands you want to set (Array of {@link IBotCommand})
   * @param scope Optional. Scope for which you want to set commands. {@link BotCommandScope}
   * @param languageCode Optional. A two-letter ISO 639-1 language code. If empty, commands will be applied to all users from the given scope, for whose language there are no dedicated commands
   * @see https://core.telegram.org/bots/api#setmycommands
   * @see https://core.telegram.org/bots#commands
   * */
  constructor(
    public readonly commands: IBotCommand[],
    public readonly scope?: BotCommandScope,
    public readonly languageCode?: string,
  ) {
    super({});
  }
}
