import { UpdateType } from '../decorators';
import { RawBotSubscriptionUpdated } from './raw-update.types';
import { RichEvent } from './rich-event';

export interface BotSubscriptionUpdated extends RawBotSubscriptionUpdated {}

/**
 * A user's payment subscription toward the bot changed state — `active` (the
 * user re-enabled a canceled subscription), `canceled`, or `failed` (payment
 * failed). Carries the {@link BotSubscriptionUpdated.user} and the original
 * `invoice_payload`.
 */
@UpdateType('subscription')
export class BotSubscriptionUpdated extends RichEvent {}
