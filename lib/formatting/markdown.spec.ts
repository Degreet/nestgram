import { entitiesToMarkdown, markdownToEntities } from './markdown';
import { RawMessageEntity } from '../events/raw-update.types';

function entity(
  type: RawMessageEntity['type'],
  offset: number,
  length: number,
  extra: Partial<RawMessageEntity> = {},
): RawMessageEntity {
  return { type, offset, length, ...extra };
}

describe('entitiesToMarkdown', () => {
  it('escapes reserved characters in plain text', () => {
    expect(entitiesToMarkdown('a_b*c.')).toBe('a\\_b\\*c\\.');
  });

  it('wraps a simple bold entity', () => {
    expect(entitiesToMarkdown('hello', [entity('bold', 0, 5)])).toBe('*hello*');
  });

  it('uses the right marker per type', () => {
    expect(entitiesToMarkdown('x', [entity('italic', 0, 1)])).toBe('_x_');
    expect(entitiesToMarkdown('x', [entity('underline', 0, 1)])).toBe('__x__');
    expect(entitiesToMarkdown('x', [entity('strikethrough', 0, 1)])).toBe(
      '~x~',
    );
    expect(entitiesToMarkdown('x', [entity('spoiler', 0, 1)])).toBe('||x||');
  });

  it('nests entities (outer opens first, inner closes first)', () => {
    const md = entitiesToMarkdown('ab', [
      entity('bold', 0, 2),
      entity('italic', 0, 1),
    ]);
    expect(md).toBe('*_a_b*');
  });

  it('renders a code span without escaping its content as text', () => {
    expect(entitiesToMarkdown('a.b', [entity('code', 0, 3)])).toBe('`a.b`');
  });

  it('escapes backticks inside a code span', () => {
    expect(entitiesToMarkdown('a`b', [entity('code', 0, 3)])).toBe('`a\\`b`');
  });

  it('renders pre with a language', () => {
    expect(
      entitiesToMarkdown('x=1', [entity('pre', 0, 3, { language: 'py' })]),
    ).toBe('```py\nx=1\n```');
  });

  it('renders a text_link with an escaped url', () => {
    const md = entitiesToMarkdown('site', [
      entity('text_link', 0, 4, { url: 'https://x.com/(a)' }),
    ]);
    // Only ')' and '\' are escaped inside the (...) part, never '('.
    expect(md).toBe('[site](https://x.com/(a\\))');
  });

  it('leaves auto-detected entities (e.g. url) as plain text', () => {
    expect(entitiesToMarkdown('see x.com', [entity('url', 4, 5)])).toBe(
      'see x\\.com',
    );
  });
});

describe('markdownToEntities', () => {
  it('parses a simple bold delimiter', () => {
    expect(markdownToEntities('*hi*')).toEqual({
      text: 'hi',
      entities: [{ type: 'bold', offset: 0, length: 2 }],
    });
  });

  it('distinguishes __ underline from _ italic', () => {
    expect(markdownToEntities('__x__').entities[0].type).toBe('underline');
    expect(markdownToEntities('_x_').entities[0].type).toBe('italic');
  });

  it('parses spoiler', () => {
    expect(markdownToEntities('||x||').entities[0].type).toBe('spoiler');
  });

  it('unescapes reserved characters in text', () => {
    expect(markdownToEntities('a\\_b\\.c').text).toBe('a_b.c');
  });

  it('parses a code span and unescapes backticks', () => {
    expect(markdownToEntities('`a\\`b`')).toEqual({
      text: 'a`b',
      entities: [{ type: 'code', offset: 0, length: 3 }],
    });
  });

  it('parses pre with a language', () => {
    expect(markdownToEntities('```py\nx=1\n```')).toEqual({
      text: 'x=1',
      entities: [{ type: 'pre', offset: 0, length: 3, language: 'py' }],
    });
  });

  it('parses a link with an unescaped url', () => {
    expect(markdownToEntities('[site](https://x.com/\\(a\\))')).toEqual({
      text: 'site',
      entities: [
        { type: 'text_link', offset: 0, length: 4, url: 'https://x.com/(a)' },
      ],
    });
  });

  it('keeps a lone bracket that is not a link', () => {
    expect(markdownToEntities('[not a link').text).toBe('[not a link');
  });
});

describe('MarkdownV2 round-trip (serialize then parse then serialize)', () => {
  const cases: Array<{ text: string; entities: RawMessageEntity[] }> = [
    { text: 'plain text', entities: [] },
    { text: 'a_b.c!', entities: [] },
    { text: 'hi', entities: [entity('bold', 0, 2)] },
    { text: 'ab', entities: [entity('bold', 0, 2), entity('italic', 0, 1)] },
    {
      text: 'ab cd',
      entities: [entity('bold', 0, 2), entity('italic', 3, 2)],
    },
    { text: 'a.b', entities: [entity('code', 0, 3)] },
    { text: 'x=1', entities: [entity('pre', 0, 3, { language: 'python' })] },
    {
      text: 'site',
      entities: [entity('text_link', 0, 4, { url: 'https://x.com/?a=1' })],
    },
  ];

  for (const { text, entities } of cases) {
    it(`round-trips: ${JSON.stringify(text)}`, () => {
      const md = entitiesToMarkdown(text, entities);
      const parsed = markdownToEntities(md);
      expect(entitiesToMarkdown(parsed.text, parsed.entities)).toBe(md);
    });
  }
});
