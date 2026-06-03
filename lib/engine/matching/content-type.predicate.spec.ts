import { ContentTypePredicate } from './content-type.predicate';
import { TelegramExecutionContext } from '../context/telegram-execution-context';

function ctx(message: unknown): TelegramExecutionContext {
  return { update: { message } } as unknown as TelegramExecutionContext;
}

describe('ContentTypePredicate', () => {
  it('matches when the content field is present', () => {
    const predicate = new ContentTypePredicate(['photo']);
    expect(predicate.matches(ctx({ photo: [{ file_id: 'x' }] }))).toBe(true);
  });

  it('does not match when the field is absent', () => {
    const predicate = new ContentTypePredicate(['photo']);
    expect(predicate.matches(ctx({ text: 'hi' }))).toBe(false);
  });

  it('matches a union when any field is present', () => {
    const predicate = new ContentTypePredicate(['text', 'caption']);
    expect(predicate.matches(ctx({ caption: 'hi' }))).toBe(true);
    expect(predicate.matches(ctx({ text: 'hi' }))).toBe(true);
    expect(predicate.matches(ctx({ dice: { emoji: '🎲', value: 1 } }))).toBe(
      false,
    );
  });

  it('does not match an update without a message', () => {
    const predicate = new ContentTypePredicate(['photo']);
    expect(
      predicate.matches({ update: {} } as unknown as TelegramExecutionContext),
    ).toBe(false);
  });
});
