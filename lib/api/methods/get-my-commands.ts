import { ApiMethod } from './api-method';
import type {
  RawBotCommand,
  RawBotCommandScope,
} from '../../events/raw-update.types';

export interface GetMyCommandsOptions {
  scope?: RawBotCommandScope;
  language_code?: string;
}

export class GetMyCommands extends ApiMethod<
  GetMyCommandsOptions,
  RawBotCommand[]
> {
  readonly method = 'getMyCommands';

  constructor(payload?: GetMyCommandsOptions) {
    super(payload);
  }
}
