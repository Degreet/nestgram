import { ApiMethod } from './api-method';
import type { RawBotCommandScope } from '../../events/raw-update.types';

export interface DeleteMyCommandsOptions {
  scope?: RawBotCommandScope;
  language_code?: string;
}

export class DeleteMyCommands extends ApiMethod<DeleteMyCommandsOptions, true> {
  readonly method = 'deleteMyCommands';

  constructor(payload?: DeleteMyCommandsOptions) {
    super(payload);
  }
}
