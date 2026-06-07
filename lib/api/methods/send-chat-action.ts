import { ApiMethod } from './api-method';

export interface SendChatActionOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  action: string;
}

/**
 * Use this method when you need to tell the user that something is happening on the bot's side. The status is set for 5 seconds or less (when a message arrives from your bot, Telegram clients clear its typing status). Returns True on success.
 * We only recommend using this method when a response from the bot will take a noticeable amount of time to arrive.
 * @see https://core.telegram.org/bots/api#sendchataction
 */
export class SendChatAction extends ApiMethod<SendChatActionOptions, true> {
  readonly method = 'sendChatAction';

  constructor(payload: SendChatActionOptions) {
    super(payload);
  }
}
