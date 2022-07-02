import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';
import { BotMenuButton } from '../../types/menu-button.types';

export class MenuButton extends MessageCreator {
  sendType: SendTypes = 'setMenuButton';
  type: MessageCreatorTypes = 'text';

  /**
   * Set chat menu button
   * @param menuButton Optional. Menu button you want to set ({@link MenuButton})
   * @param chatId Optional. Chat ID in which you want to set menu button. It can be id of group/channel or ID of the user. Or pass '_current' to set chat menu button for current chat
   * @see https://core.telegram.org/bots/api#setchatmenubutton
   * @return {true} on success
   * */
  constructor(
    public readonly menuButton?: BotMenuButton,
    public readonly chatId?: number | string | '_current',
  ) {
    super({});
  }
}
