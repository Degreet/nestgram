import { TelegramExecutionContext } from '../context';
import { CommandPredicate } from './command.predicate';
import { CommandRoutePattern } from '../../command-args';

function messageCtx(text?: string): TelegramExecutionContext {
  return {
    kind: 'message',
    update: { message: text === undefined ? {} : { text } },
  } as unknown as TelegramExecutionContext;
}

function predicate(template: string): CommandPredicate {
  return new CommandPredicate(CommandRoutePattern.compile(template));
}

describe('CommandPredicate', () => {
  describe('a bare command (no argument segments)', () => {
    const start = predicate('start');

    it('matches the command with no arguments', () => {
      expect(start.matches(messageCtx('/start'))).toBe(true);
    });

    it('matches a @BotName suffix with no arguments', () => {
      expect(start.matches(messageCtx('/start@MyBot'))).toBe(true);
    });

    it('tolerates leading whitespace', () => {
      expect(start.matches(messageCtx('   /start'))).toBe(true);
    });

    it('does NOT match when arguments are present (exact arity)', () => {
      expect(start.matches(messageCtx('/start now please'))).toBe(false);
      expect(start.matches(messageCtx('/start@MyBot now'))).toBe(false);
    });

    it('does not match a different or longer command', () => {
      expect(start.matches(messageCtx('/started'))).toBe(false);
      expect(start.matches(messageCtx('/help'))).toBe(false);
    });

    it('does not match plain text or a missing text', () => {
      expect(start.matches(messageCtx('start'))).toBe(false);
      expect(start.matches(messageCtx(undefined))).toBe(false);
    });
  });

  describe('a parameterised command', () => {
    const add = predicate('add :amount :note...');

    it('matches and captures when the shape fits', () => {
      expect(add.matches(messageCtx('/add 5 buy milk'))).toBe(true);
      expect(add.extractParams(messageCtx('/add 5 buy milk'))).toEqual({
        amount: '5',
        note: 'buy milk',
      });
    });

    it('captures across a @BotName suffix', () => {
      expect(add.extractParams(messageCtx('/add@MyBot 5 milk'))).toEqual({
        amount: '5',
        note: 'milk',
      });
    });

    it('does not match too few arguments', () => {
      expect(add.matches(messageCtx('/add 5'))).toBe(false);
      expect(add.extractParams(messageCtx('/add 5'))).toBeNull();
    });
  });

  describe('arity overloading', () => {
    const one = predicate('add :amount');
    const two = predicate('add :amount :note...');

    it('selects disjoint handlers by argument count', () => {
      expect(one.matches(messageCtx('/add 5'))).toBe(true);
      expect(one.matches(messageCtx('/add 5 milk'))).toBe(false);

      expect(two.matches(messageCtx('/add 5'))).toBe(false);
      expect(two.matches(messageCtx('/add 5 milk'))).toBe(true);
    });
  });
});
