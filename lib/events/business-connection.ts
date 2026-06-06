import { UpdateType } from '../decorators';
import { RawBusinessConnection } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface BusinessConnection extends RawBusinessConnection {}

/** The bot was connected to / disconnected from a business account. */
@UpdateType('business_connection')
export class BusinessConnection extends RichEvent {}
