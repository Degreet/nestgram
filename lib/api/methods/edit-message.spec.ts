import { EditMessageText } from './edit-message-text';
import { EditMessageReplyMarkup } from './edit-message-reply-markup';
import { Message } from '../../events';
import { BotService } from '../bot.service';

// wrap() only uses the bot to construct a rich Message, so a bare stub suffices.
const bot = {} as unknown as BotService;

describe('edit-message wrap()', () => {
  it('EditMessageText wraps an object result in a Message', () => {
    const method = new EditMessageText({ text: 'x' });
    const result = method.wrap({ message_id: 1 }, bot);
    expect(result).toBeInstanceOf(Message);
  });

  it('EditMessageText passes through a `true` (inline) result', () => {
    const method = new EditMessageText({ text: 'x' });
    expect(method.wrap(true, bot)).toBe(true);
  });

  it('EditMessageReplyMarkup passes through a `true` result', () => {
    const method = new EditMessageReplyMarkup({});
    expect(method.wrap(true, bot)).toBe(true);
  });
});
