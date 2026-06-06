import { UpdateType } from '../decorators';
import { RawBusinessMessagesDeleted } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface BusinessMessagesDeleted extends RawBusinessMessagesDeleted {}

/** Messages were deleted from a connected business account. */
@UpdateType('deleted_business_messages')
export class BusinessMessagesDeleted extends RichEvent {}
