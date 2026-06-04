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

export class SetMyCommands extends ApiMethod<SetMyCommandsOptions, true> {
  readonly method = 'setMyCommands';

  constructor(payload: SetMyCommandsOptions) {
    super(payload);
  }
}
