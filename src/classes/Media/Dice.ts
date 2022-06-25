import { Media } from './Media';
import { DiceEmojis, ISendDiceOptions, MediaSendTypes } from '../../types';

export class Dice extends Media {
  type: MediaSendTypes = 'dice';

  /**
   * Send dice
   * @param emoji Dice emoji {@link DiceEmojis}
   * @param moreOptions Message options {@link ISendDiceOptions}
   * @see https://core.telegram.org/bots/api#senddice
   * */
  constructor(
    public readonly emoji?: DiceEmojis,
    public readonly moreOptions: ISendDiceOptions = {},
  ) {
    super('path', 'none', moreOptions);
  }
}
