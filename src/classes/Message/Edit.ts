import { MessageCreator } from './MessageCreator';
import { IEditTextOptions, MessageCreatorTypes, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class Edit extends MessageCreator {
  sendType: SendTypes = 'edit';
  type: MessageCreatorTypes = 'text';

  /**
   * Edit a message
   * @param text Text you want to edit
   * @param keyboard Optional. Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Optional. More options {@link IEditTextOptions}
   * @param msgId Optional. Message ID you want to edit. Current message id by default
   * @see https://core.telegram.org/bots/api#editmessagemedia
   * */
  constructor(
    public readonly text: string,
    public readonly keyboard?: Keyboard,
    public readonly moreOptions: IEditTextOptions = {},
    public readonly msgId?: number,
  ) {
    super(moreOptions);
  }
}
