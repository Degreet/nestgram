import { ApiMethod } from './api-method';

export interface ReadBusinessMessageOptions {
  business_connection_id: string;
  chat_id: number;
  message_id: number;
}

export class ReadBusinessMessage extends ApiMethod<
  ReadBusinessMessageOptions,
  true
> {
  readonly method = 'readBusinessMessage';

  constructor(payload: ReadBusinessMessageOptions) {
    super(payload);
  }
}
