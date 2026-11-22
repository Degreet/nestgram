import { ApiMethod } from './api-method';

export interface EditMessageWidgetDataOptions {
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  public_data?: string;
  chat_data?: string;
}

/**
 * Use this method to edit data of a widget in a message sent by the bot or via the bot (for inline bots). Public data of a shared widget can be changed at most once per second. On success, True is returned.
 * @see https://core.telegram.org/bots/api#editmessagewidgetdata
 */
export class EditMessageWidgetData extends ApiMethod<
  EditMessageWidgetDataOptions,
  true
> {
  readonly method = 'editMessageWidgetData';

  constructor(payload?: EditMessageWidgetDataOptions) {
    super(payload);
  }
}
