import { EditMessageText } from './edit-message-text';
import { EditMessageReplyMarkup } from './edit-message-reply-markup';
import { Message } from '../../events';
import { BotService } from '../bot.service';

const bot = { token: 'TEST' } as unknown as BotService;

describe('edit-message interceptors', () => {
  it('EditMessageText wraps an object result in a Message', () => {
    const method = new EditMessageText(bot, { text: 'x' });
    const result = method.interceptor({ message_id: 1 } as unknown as Message);
    expect(result).toBeInstanceOf(Message);
  });

  it('EditMessageText passes through a `true` (inline) result', () => {
    const method = new EditMessageText(bot, { text: 'x' });
    expect(method.interceptor(true)).toBe(true);
  });

  it('EditMessageReplyMarkup passes through a `true` result', () => {
    const method = new EditMessageReplyMarkup(bot, {});
    expect(method.interceptor(true)).toBe(true);
  });
});
