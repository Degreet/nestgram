import { ApiMethod } from './api-method';

export interface SendChatJoinRequestWebAppOptions {
  chat_join_request_query_id: string;
  web_app_url: string;
}

/**
 * Use this method to process a received chat join request query by showing a Mini App to the user before deciding the outcome. Returns True on success.
 * @see https://core.telegram.org/bots/api#sendchatjoinrequestwebapp
 */
export class SendChatJoinRequestWebApp extends ApiMethod<
  SendChatJoinRequestWebAppOptions,
  true
> {
  readonly method = 'sendChatJoinRequestWebApp';

  constructor(payload: SendChatJoinRequestWebAppOptions) {
    super(payload);
  }
}
