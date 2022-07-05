import { ControllerClass } from './decorators.types';
import { MiddlewareFunction } from './middleware.types';
import {
  IChatJoinRequest,
  IContact,
  IDice,
  ILocation,
  IMessage,
  IMessageEntity,
  IPoll,
  IUpdate,
  IVenue,
} from './update.types';

import { Answer, Keyboard, Media, MessageCreator } from '../classes';
import { IChat, IUser } from './chat.types';
import { MarkCreator } from '../classes/Marks/MarkCreator';

export interface IHandler {
  controller: ControllerClass;
  middlewares: MiddlewareFunction[];
  methodKey: string;
  scope?: string;
}

export type ArgsTypes = [
  IUpdate, // update
  IMessage | undefined, // message
  string | undefined, // message text
  Answer, // answer
  IMessageEntity[] | undefined, // message entities
  string[], // command params
  any, // params
  IUser | undefined, // sender
  number | undefined, // user id
  ILocation, // location
  IContact, // contact
  IVenue, // venue
  IPoll, // poll
  IDice, // dice
  IChat, // chat
  IChatJoinRequest, // join request
];

export type ContentTypes = Media | string | undefined | null;
export type EditContentTypes = Media | MarkCreator | Keyboard | string;

export type HandlerMethod = ((...args: ArgsTypes) => MessageCreator | ContentTypes) & {
  prototype: { name: 'AsyncFunction' | 'Function' };
};
