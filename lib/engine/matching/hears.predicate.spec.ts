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

  describe('captures', () => {
    it('exposes the RegExpMatchArray of a regex pattern (for @Matches)', () => {
      const add = new HearsPredicate(/^add (\d+) (.+)$/);
      const match = add.extractMatch(messageCtx('add 5 milk'));

      expect(match?.[1]).toBe('5');
      expect(match?.[2]).toBe('milk');
    });

    it('exposes named groups to @Param via extractParams', () => {
      const add = new HearsPredicate(/^add (?<amount>\d+)$/);

      expect(add.extractParams(messageCtx('add 5'))).toEqual({ amount: '5' });
    });

    it('has no captures for a string pattern, a non-match, or missing text', () => {
      expect(
        new HearsPredicate('hi').extractMatch(messageCtx('hi')),
      ).toBeNull();

      const add = new HearsPredicate(/^add (\d+)$/);
      expect(add.extractMatch(messageCtx('nope'))).toBeNull();
      expect(add.extractMatch(messageCtx(undefined))).toBeNull();
      // A positional-only match has no named groups, so @Param sees nothing.
      expect(add.extractParams(messageCtx('add 5'))).toBeNull();
    });
  });
});
