import { MessageEntityTypes } from '../../types';

function defineArgumentMetadata(
  target: any,
  propertyKey: string,
  parameterIndex: number,
  gotIndexName: string,
  metadataKey: string = 'gotIndex',
): void {
  Reflect.defineMetadata(
    metadataKey,
    {
      ...(Reflect.getMetadata(metadataKey, target, propertyKey) || {}),
      [gotIndexName]: parameterIndex,
    },
    target,
    propertyKey,
  );
}

function buildArgumentDecorator(gotIndexName: string): ParameterDecorator {
  return function (target: any, propertyKey: string, parameterIndex: number): any {
    defineArgumentMetadata(target, propertyKey, parameterIndex, gotIndexName);
    return target;
  };
}

/**
 * Entity from sent message
 * @param entity Entity type that you want to get
 * */
export function Entity(entity: MessageEntityTypes) {
  return function (target: any, propertyKey: string, parameterIndex: number): any {
    Reflect.defineMetadata('gotEntityType', entity, target, propertyKey);
    defineArgumentMetadata(target, propertyKey, parameterIndex, entity, 'gotEntityTypes');
    defineArgumentMetadata(target, propertyKey, parameterIndex, 'entities');
    return target;
  };
}

/**
 * Message text
 * */
export const Text = () => buildArgumentDecorator('text');

/**
 * Answer {@link Answer}
 * */
export const Answ = () => buildArgumentDecorator('answer');

/**
 * Message sent by user
 * */
export const Message = () => buildArgumentDecorator('message');

/**
 * Received update
 * */
export const Update = () => buildArgumentDecorator('update');

/**
 * Message entities
 * */
export const Entities = () => buildArgumentDecorator('entities');

/**
 * Command params
 * */
export const CommandParams = () => buildArgumentDecorator('commandParams');

/**
 * Params received from middlewares
 * */
export const Params = () => buildArgumentDecorator('params');

/**
 * Who sent the message
 * */
export const Sender = () => buildArgumentDecorator('sender');

/**
 * User id who sent the message
 * */
export const UserId = () => buildArgumentDecorator('userId');
