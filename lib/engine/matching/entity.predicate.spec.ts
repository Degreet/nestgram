import { EntityPredicate } from './entity.predicate';
import { TelegramExecutionContext } from '../context/telegram-execution-context';

function ctx(message: unknown): TelegramExecutionContext {
  return { update: { message } } as unknown as TelegramExecutionContext;
}

describe('EntityPredicate', () => {
  it('matches when a text entity of the type is present', () => {
    const predicate = new EntityPredicate('email');
    expect(
      predicate.matches(
        ctx({ entities: [{ type: 'email', offset: 0, length: 1 }] }),
      ),
    ).toBe(true);
  });

  it('matches an entity in the caption', () => {
    const predicate = new EntityPredicate('url');
    expect(
      predicate.matches(
        ctx({ caption_entities: [{ type: 'url', offset: 0, length: 1 }] }),
      ),
    ).toBe(true);
  });

  it('does not match a different entity type', () => {
    const predicate = new EntityPredicate('email');
    expect(
      predicate.matches(
        ctx({ entities: [{ type: 'url', offset: 0, length: 1 }] }),
      ),
    ).toBe(false);
  });

  it('does not match a message without entities', () => {
    expect(new EntityPredicate('email').matches(ctx({ text: 'hi' }))).toBe(
      false,
    );
  });
});
