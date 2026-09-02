import { UpdateType } from '../decorators';
import { RawManagedBotUpdated } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface ManagedBotUpdated extends RawManagedBotUpdated {}

/**
 * A bot managed by this bot was created, or had its token or owner changed.
 * Only Secretary Bots receive this. {@link ManagedBotUpdated.bot} is the managed
 * bot; {@link ManagedBotUpdated.user} is its owner.
 */
@UpdateType('managed_bot')
export class ManagedBotUpdated extends RichEvent {}
