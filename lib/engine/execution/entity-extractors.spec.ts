import { extractEntities, extractEntity } from './extractors';
import { TelegramExecutionContext } from '../context/telegram-execution-context';

function ctx(message: unknown): TelegramExecutionContext {
  return {
    kind: 'message',
    update: { message },
  } as unknown as TelegramExecutionContext;
}

describe('entity extraction', () => {
  const message = {
    text: 'mail me at a@b.com or c@d.com',
    entities: [
      { type: 'email', offset: 11, length: 7 },
      { type: 'email', offset: 22, length: 7 },
    ],
  };

  it('extractEntity returns the first match, sliced by offset/length', () => {
    expect(extractEntity(ctx(message), 'email')).toBe('a@b.com');
  });

  it('extractEntities returns every match', () => {
    expect(extractEntities(ctx(message), 'email')).toEqual([
      'a@b.com',
      'c@d.com',
    ]);
  });

  it('returns text entities before caption entities', () => {
    const both = {
      text: 'x@y.com',
      entities: [{ type: 'email', offset: 0, length: 7 }],
      caption: 'z@w.com',
      caption_entities: [{ type: 'email', offset: 0, length: 7 }],
    };
    expect(extractEntities(ctx(both), 'email')).toEqual(['x@y.com', 'z@w.com']);
  });

  it('reads caption entities too', () => {
    const captioned = {
      caption: 'see #sale',
      caption_entities: [{ type: 'hashtag', offset: 4, length: 5 }],
    };
    expect(extractEntity(ctx(captioned), 'hashtag')).toBe('#sale');
  });

  it('returns empty / undefined when the type is absent', () => {
    expect(extractEntities(ctx({ text: 'hi' }), 'email')).toEqual([]);
    expect(extractEntity(ctx({ text: 'hi' }), 'email')).toBeUndefined();
  });
});
