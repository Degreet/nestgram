import { ApiMethod } from './api-method';
import type { RawBotCommandScope } from '../../events/raw-update.types';

export interface DeleteMyCommandsOptions {
  scope?: RawBotCommandScope;
  language_code?: string;
}

/**
 * Use this method to delete the list of the bot's commands for the given scope and user language. After deletion, higher level commands will be shown to affected users. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletemycommands
 */
export class DeleteMyCommands extends ApiMethod<DeleteMyCommandsOptions, true> {
  readonly method = 'deleteMyCommands';

  constructor(payload?: DeleteMyCommandsOptions) {
    super(payload);
  }
}
