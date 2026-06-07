import { ApiMethod } from './api-method';
import type {
  RawBotCommand,
  RawBotCommandScope,
} from '../../events/raw-update.types';

export interface SetMyCommandsOptions {
  commands: RawBotCommand[];
  scope?: RawBotCommandScope;
  language_code?: string;
}

/**
 * Use this method to change the list of the bot's commands. See this manual for more details about bot commands. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmycommands
 */
export class SetMyCommands extends ApiMethod<SetMyCommandsOptions, true> {
  readonly method = 'setMyCommands';

  constructor(payload: SetMyCommandsOptions) {
    super(payload);
  }
}
