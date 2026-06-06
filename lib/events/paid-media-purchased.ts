import { UpdateType } from '../decorators';
import { RawPaidMediaPurchased } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface PaidMediaPurchased extends RawPaidMediaPurchased {}

/** A user purchased paid media the bot sent with a non-empty payload. */
@UpdateType('purchased_paid_media')
export class PaidMediaPurchased extends RichEvent {}
