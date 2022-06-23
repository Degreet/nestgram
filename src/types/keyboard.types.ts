import { KeyboardTypes } from '../enums';

export interface IReplyMarkup extends IInlineKeyboard, IKeyboard, IPlaceholder {}

export interface IInlineKeyboard {
  inline_keyboard?: IButton[][];
}

export interface IKeyboard {
  keyboard?: IButton[][];
}

export interface IPlaceholder {
  placeholder?: string;
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

export interface IKeyboardLayout {
  name: string;
  rows: IButton[][];
  type: KeyboardTypes;
}
