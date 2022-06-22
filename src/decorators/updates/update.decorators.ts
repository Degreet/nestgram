import { setupArguments } from './setup-arguments';
import { Middleware } from './middleware.decorator';
import { ListenMiddleware } from '../../classes/Helpers/ListenMiddleware';
import { MediaFileTypes, MessageEntityTypes } from '../../types';
import { MessageSubtypes } from '../../types/listen-middlewares.types';

export function buildUpdateDecorator(
  listenMiddlewareName: string,
  ...args: any[]
): MethodDecorator {
  return function (target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    setupArguments(target, key, descriptor);
    Middleware(ListenMiddleware[listenMiddlewareName](...args))(target, key, descriptor);
    return descriptor;
  };
}

/**
 * Listen for a user that send some command and call method
 * @param commandText Command that you want to listen
 * @see https://core.telegram.org/bots/api#message
 * @see https://core.telegram.org/bots/api#messageentity
 * */
export const OnCommand = (commandText?: string): MethodDecorator =>
  buildUpdateDecorator('command', commandText);

/**
 * Listen for a user that send some text as message
 * @param text Text of the message that you want to listen
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnText = (text?: string): MethodDecorator => buildUpdateDecorator('text', text);

/**
 * Listen for a user that send some message (e.g. sends photo, video, any media or text message)
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnMessage = (subtype?: MessageSubtypes): MethodDecorator =>
  buildUpdateDecorator('message', subtype);

/**
 * Listen for a user that edit some message
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnMessageEdit = (): MethodDecorator => buildUpdateDecorator('message', 'edit');

/**
 * Listen for a channel that publish some post
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnPost = (): MethodDecorator => buildUpdateDecorator('message', 'post');

/**
 * Listen for a channel that edit some post
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnPostEdit = (): MethodDecorator => buildUpdateDecorator('message', 'post_edit');

/**
 * Listen for a user that send some message with entities (e.g. command, hashtag, email, phone_number and other in {@link IMessageEntity})
 * @param entity Entity that you want to listen ({@link MessageEntityTypes})
 * @see https://core.telegram.org/bots/api#messageentity
 * */
export const OnEntity = (entity?: MessageEntityTypes): MethodDecorator =>
  buildUpdateDecorator('entity', entity);

/**
 * Listen for a user that click on button with some id
 * @param buttonId The id of the button you want to track.
 * @see https://core.telegram.org/bots/api#callbackquery
 * */
export const OnClick = (buttonId: string): MethodDecorator =>
  buildUpdateDecorator('click', buttonId);

/**
 * Listen for a user that send some media file (e.g. photo, video, audio)
 * @param media Media type that you want to listen
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnMedia = (media?: MediaFileTypes): MethodDecorator =>
  buildUpdateDecorator('media', media);

/**
 * Listen for a user that send a photo
 * @see https://core.telegram.org/bots/api#photosize
 * */
export const OnPhoto = (): MethodDecorator => buildUpdateDecorator('media', 'photo');

/**
 * Listen for a user that send a video
 * @see https://core.telegram.org/bots/api#video
 * */
export const OnVideo = (): MethodDecorator => buildUpdateDecorator('media', 'video');

/**
 * Listen for a user that send an audio
 * @see https://core.telegram.org/bots/api#audio
 * */
export const OnAudio = (): MethodDecorator => buildUpdateDecorator('media', 'audio');

/**
 * Listen for a user that send a video note
 * @see https://core.telegram.org/bots/api#videonote
 * */
export const OnVideoNote = (): MethodDecorator => buildUpdateDecorator('media', 'video_note');

/**
 * Listen for a user that send a voice message
 * @see https://core.telegram.org/bots/api#voice
 * */
export const OnVoice = (): MethodDecorator => buildUpdateDecorator('media', 'voice');

/**
 * Listen for a user that send an animation
 * @see https://core.telegram.org/bots/api#animation
 * */
export const OnAnimation = (): MethodDecorator => buildUpdateDecorator('media', 'animation');

/**
 * Listen for a user that send a document
 * @see https://core.telegram.org/bots/api#document
 * */
export const OnDocument = (): MethodDecorator => buildUpdateDecorator('media', 'document');

/**
 * Listen for an update
 * @see https://core.telegram.org/bots/api#update
 * */
export const OnUpdate = (): MethodDecorator => buildUpdateDecorator('update');

/**
 * Listen for a user that forwards a message
 * @see https://core.telegram.org/bots/api#message
 * */
export const OnForward = (): MethodDecorator => buildUpdateDecorator('forward');
