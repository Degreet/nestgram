import { UpdateType } from '../decorators';
import { RawPollAnswer } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface PollAnswer extends RawPollAnswer {}

/** A user changed their answer in a non-anonymous poll. */
@UpdateType('poll_answer')
export class PollAnswer extends RichEvent {}
