import { MessageCreator } from './MessageCreator';
import { EditContentTypes, IEditTextOptions, MessageCreatorTypes, SendTypes } from '../../types';
import { Keyboard } from '../Keyboard/Keyboard';

export class Edit extends MessageCreator {
  sendType: SendTypes = 'edit';
  type: MessageCreatorTypes = 'text';

  /**
   * Edit a message
   * @param content Content you want to edit (string or Caption class)
   * @param keyboard Optional. Pass Keyboard class if you want to add keyboard to the message
   * @param moreOptions Optional. More options {@link IEditTextOptions}
   * @param msgId Optional. Message ID you want to edit. Current message id by default
   * @see https://core.telegram.org/bots/api#editmessagemedia
   * */
  constructor(
    public readonly content: EditContentTypes,
    public readonly keyboard?: Keyboard,
    public readonly moreOptions: IEditTextOptions = {},
    public readonly msgId?: number,
  ) {
    super(moreOptions);
  }
}
