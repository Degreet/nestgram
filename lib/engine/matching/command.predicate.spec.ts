import { TelegramExecutionContext } from '../context';
import { CommandPredicate } from './command.predicate';

function messageCtx(text?: string): TelegramExecutionContext {
  return {
    kind: 'message',
    update: { message: text === undefined ? {} : { text } },
  } as unknown as TelegramExecutionContext;
}

describe('CommandPredicate', () => {
  const start = new CommandPredicate('start');

  it('matches the bare command', () => {
    expect(start.matches(messageCtx('/start'))).toBe(true);
  });

  it('matches the command with arguments', () => {
    expect(start.matches(messageCtx('/start now please'))).toBe(true);
  });

  it('matches the command with a @BotName suffix', () => {
    expect(start.matches(messageCtx('/start@MyBot'))).toBe(true);
    expect(start.matches(messageCtx('/start@MyBot now'))).toBe(true);
  });

  it('tolerates leading whitespace', () => {
    expect(start.matches(messageCtx('   /start'))).toBe(true);
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
