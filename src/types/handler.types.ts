import { ControllerClass } from './decorators.types';
import { MiddlewareFunction } from './middleware.types';
import { IMessage, IMessageEntity, IUpdate } from './update.types';
import { Answer, Media, MessageCreator } from '../classes';

export interface IHandler {
  controller: ControllerClass;
  middlewares: MiddlewareFunction[];
  methodKey: string;
}

export type ArgsTypes = [
  IUpdate, // update
  IMessage | undefined, // message
  string | undefined, // message text
  Answer, // answer
  IMessageEntity[] | undefined, // message entities
];

export type ContentTypes = Media | string | undefined | null;

export type HandlerMethod = ((...args: ArgsTypes) => MessageCreator | ContentTypes) & {
  prototype: { name: 'AsyncFunction' | 'Function' };
};
