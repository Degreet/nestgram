import { ApiMethod } from './api-method';
import type {
  RawBotCommand,
  RawBotCommandScope,
} from '../../events/raw-update.types';

export interface GetMyCommandsOptions {
  scope?: RawBotCommandScope;
  language_code?: string;
}

/**
 * Use this method to get the current list of the bot's commands for the given scope and user language. Returns an Array of BotCommand objects. If commands aren't set, an empty list is returned.
 * @see https://core.telegram.org/bots/api#getmycommands
 */
export class GetMyCommands extends ApiMethod<
  GetMyCommandsOptions,
  RawBotCommand[]
> {
  readonly method = 'getMyCommands';

  constructor(payload?: GetMyCommandsOptions) {
    super(payload);
  }
}
