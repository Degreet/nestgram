import {
  SendMessage,
  GetMe,
  GetUpdates,
  SendMessageOptions,
  GetUpdatesOptions,
  DeleteWebhookOptions,
  DeleteWebhook,
} from './bot';

export class Api {
  constructor(private readonly token: string) {}

  deleteWebhook(options?: DeleteWebhookOptions) {
    return new DeleteWebhook(this.token, options).fetch();
  }

  getMe() {
    return new GetMe(this.token).fetch();
  }

  getUpdates(options?: GetUpdatesOptions) {
    return new GetUpdates(this.token, options).fetch();
  }

  sendMessage(
    chat_id: number | string,
    text: string,
    options?: SendMessageOptions,
  ) {
    return new SendMessage(this.token, {
      chat_id,
      text,
      ...(options ?? {}),
    }).fetch();
  }
}
