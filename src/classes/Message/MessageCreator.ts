import { Keyboard } from '../Keyboard/Keyboard';
import { ContentTypes } from '../../types';
import { error } from '../../logger';
import { Media } from '../Media';

export class MessageCreator {
  type: 'photo' | 'text';

  constructor(
    public readonly content: ContentTypes,
    public readonly keyboard: Keyboard | null = null,
    public readonly options: any = {},
  ) {
    if (!content)
      throw error('[new Message]'.bgGreen, 'You must provide content if you want to send message');

    if (content instanceof Media) {
      this.type = content.fileType;
    } else {
      this.type = 'text';
    }

    if (keyboard) {
      keyboard.row();
      options.reply_markup = {
        [keyboard.keyboardType]: keyboard.rows,
        placeholder: keyboard.placeholder,
      };
    }
  }
}
