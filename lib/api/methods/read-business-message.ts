import { ApiMethod } from './api-method';

export interface ReadBusinessMessageOptions {
  business_connection_id: string;
  chat_id: number;
  message_id: number;
}

/**
 * Marks incoming message as read on behalf of a business account. Requires the can_read_messages business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#readbusinessmessage
 */
export class ReadBusinessMessage extends ApiMethod<
  ReadBusinessMessageOptions,
  true
> {
  readonly method = 'readBusinessMessage';

  constructor(payload: ReadBusinessMessageOptions) {
    super(payload);
  }
}
