import { TelegramExecutionContext } from '../context';
import { HearsPredicate } from './hears.predicate';

function messageCtx(text?: string): TelegramExecutionContext {
  return {
    kind: 'message',
    update: { message: text === undefined ? {} : { text } },
  } as unknown as TelegramExecutionContext;
}

describe('HearsPredicate', () => {
  it('matches a string exactly', () => {
    const hi = new HearsPredicate('hi');
    expect(hi.matches(messageCtx('hi'))).toBe(true);
    expect(hi.matches(messageCtx('hi there'))).toBe(false);
  });

  it('tests a RegExp against the text', () => {
    const digits = new HearsPredicate(/^\d+$/);
    expect(digits.matches(messageCtx('123'))).toBe(true);
    expect(digits.matches(messageCtx('12a'))).toBe(false);
  });

  it('matches consistently with a global regex (no lastIndex drift)', () => {
    const digits = new HearsPredicate(/\d+/g);
    expect(digits.matches(messageCtx('1'))).toBe(true);
    // A stateful /g would advance lastIndex and miss the second time.
    expect(digits.matches(messageCtx('2'))).toBe(true);
  });

  it('does not match when there is no text', () => {
    expect(new HearsPredicate('hi').matches(messageCtx(undefined))).toBe(false);
  });
});
