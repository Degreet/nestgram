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
