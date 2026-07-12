import { messageEntities } from './message-entity';

describe('messageEntities', () => {
  it('slices each entity of the requested type out of the text', () => {
    const entities = messageEntities(
      {
        text: 'ping @alice and @bob',
        entities: [
          { type: 'mention', offset: 5, length: 6 },
          { type: 'mention', offset: 16, length: 4 },
        ],
      },
      'mention',
    );
    expect(entities.map((entity) => entity.text)).toEqual(['@alice', '@bob']);
  });

  it('draws from the text and the caption both', () => {
    const entities = messageEntities({
      text: 'see #news',
      entities: [{ type: 'hashtag', offset: 4, length: 5 }],
      caption: 'and #sport',
      caption_entities: [{ type: 'hashtag', offset: 4, length: 6 }],
    });
    expect(entities.map((entity) => entity.text)).toEqual(['#news', '#sport']);
  });

  it('keeps only the requested type', () => {
    const entities = messageEntities(
      {
        text: 'mail a@b.co about http://x.io',
        entities: [
          { type: 'email', offset: 5, length: 6 },
          { type: 'url', offset: 18, length: 11 },
        ],
      },
      'url',
    );
    expect(entities.map((entity) => entity.text)).toEqual(['http://x.io']);
  });

  it('returns every entity when no type is given', () => {
    const entities = messageEntities({
      text: '@a #b',
      entities: [
        { type: 'mention', offset: 0, length: 2 },
        { type: 'hashtag', offset: 3, length: 2 },
      ],
    });
    expect(entities.map((entity) => entity.type)).toEqual([
      'mention',
      'hashtag',
    ]);
  });

  it('preserves the raw entity fields alongside the sliced text', () => {
    const [entity] = messageEntities({
      text: 'ping @bob',
      entities: [{ type: 'mention', offset: 5, length: 4, url: 'x' }],
    });
    expect(entity).toEqual({
      type: 'mention',
      offset: 5,
      length: 4,
      url: 'x',
      text: '@bob',
    });
  });

  it('honors UTF-16 offsets past a surrogate-pair emoji', () => {
    // '👍' is two UTF-16 code units, so '@bob' starts at offset 3 — the same
    // units Telegram counts, and the same units JS `slice` indexes.
    const [entity] = messageEntities({
      text: '👍 @bob',
      entities: [{ type: 'mention', offset: 3, length: 4 }],
    });
    expect(entity.text).toBe('@bob');
  });

  it('is empty when the message carries no entities', () => {
    expect(messageEntities({ text: 'plain' })).toEqual([]);
  });
});
