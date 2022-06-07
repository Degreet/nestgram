import { KeyboardTypes } from '../enums';

export interface ReplyMarkup {
  inline_keyboard?: IButton[][];
  keyboard?: IButton[][];
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
