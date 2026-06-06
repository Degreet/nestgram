import { UpdateType } from '../decorators';
import { RawPoll } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface Poll extends RawPoll {}

/** A poll state update (new votes, or the poll was stopped). */
@UpdateType('poll')
export class Poll extends RichEvent {}
