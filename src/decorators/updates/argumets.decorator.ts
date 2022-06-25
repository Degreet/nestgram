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
export const GetAnswer = () => buildArgumentDecorator('answer');

/**
 * Answer {@link Answer}
 * @deprecated Use @GetAnswer instead
 * */
export const Answ = GetAnswer;

/**
 * Message sent by user {@link IMessage}
 * */
export const Message = () => buildArgumentDecorator('message');

/**
 * Received update {@link IUpdate}
 * */
export const Update = () => buildArgumentDecorator('update');

/**
 * Message entities (array of {@link IMessageEntity})
 * */
export const Entities = () => buildArgumentDecorator('entities');

/**
 * Command params (array of string)
 * */
export const CommandParams = () => buildArgumentDecorator('commandParams');

/**
 * Params received from middlewares
 * */
export const Params = () => buildArgumentDecorator('params');

/**
 * Who sent the message {@link IUser}
 * */
export const Sender = () => buildArgumentDecorator('sender');

/**
 * User id who sent the message (number)
 * */
export const UserId = () => buildArgumentDecorator('userId');

/**
 * Location that user sent
 * */
export const GetLocation = () => buildArgumentDecorator('location');

/**
 * Location that user sent
 * @deprecated Use @GetLocation instead
 * */
export const ReceivedLocation = GetLocation;

/**
 * Contact that user sent
 * */
export const GetContact = () => buildArgumentDecorator('contact');

/**
 * Contact that user sent
 * @deprecated Use @GetContact instead
 * */
export const ReceivedContact = GetContact;

/**
 * Venue that user sent
 * */
export const GetVenue = () => buildArgumentDecorator('venue');

/**
 * Venue that user sent
 * @deprecated Use @GetVenue instead
 * */
export const ReceivedVenue = GetVenue;

/**
 * Venue that user sent
 * */
export const GetPoll = () => buildArgumentDecorator('poll');

/**
 * Venue that user sent
 * @deprecated Use @GetPoll instead
 * */
export const ReceivedPoll = GetPoll;
