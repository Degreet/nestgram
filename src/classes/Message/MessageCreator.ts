import { Keyboard } from '../Keyboard/Keyboard';
import { ContentTypes, MediaFileTypes, SendTypes } from '../../types';
import { Media } from '../Media';

export class MessageCreator {
  type: MediaFileTypes | 'text';
  sendType: SendTypes;

  constructor(
    public readonly content: ContentTypes,
    public readonly keyboard: Keyboard | null = null,
    public readonly options: any = {},
  ) {
    if (content instanceof Media) {
      this.type = content.fileType;
    } else {
      this.type = 'text';
    }

    if (keyboard) options.reply_markup = keyboard.buildMarkup();
  }
}
