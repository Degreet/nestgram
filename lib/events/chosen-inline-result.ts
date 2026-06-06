import { UpdateType } from '../decorators';
import { RawChosenInlineResult } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ChosenInlineResult extends RawChosenInlineResult {}

/** The result a user picked from an inline query's answer. */
@UpdateType('chosen_inline_result')
export class ChosenInlineResult extends RichEvent {}
