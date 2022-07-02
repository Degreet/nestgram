import { IWebAppInfo } from './web-app.types';

export type MenuButtonTypes = 'default' | 'commands' | 'web_app';
export type BotMenuButton = IMenuButtonCommands | IMenuButtonWebApp | IMenuButtonDefault;

export interface IMenuButtonDefaultOptions {
  type: MenuButtonTypes;
}

export interface IMenuButtonCommands extends IMenuButtonDefaultOptions {
  type: 'commands';
}

export interface IMenuButtonWebApp extends IMenuButtonDefaultOptions {
  type: 'web_app';
  text: string;
  web_app?: IWebAppInfo;
}

export interface IMenuButtonDefault extends IMenuButtonDefaultOptions {
  type: 'default';
}
