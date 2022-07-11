export interface IReplyMarkup extends IInlineKeyboard, IKeyboard {}

export interface IInlineKeyboard {
  inline_keyboard?: IButton[][];
}

export interface IKeyboard {
  keyboard?: IButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface IWebAppButton {
  url?: string;
}

export interface IButton {
  text: string;
  url?: string;
  callback_data?: string;
  request_contact?: boolean;
  request_location?: boolean;
  switch_inline_query?: string;
  web_app?: IWebAppButton;
  pay?: boolean;
}
