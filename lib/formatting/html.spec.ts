import { entitiesToHtml, htmlToEntities } from './html';
import { RawMessageEntity } from '../events/raw-update.types';

function entity(
  type: string,
  offset: number,
  length: number,
  extra: Partial<RawMessageEntity> = {},
): RawMessageEntity {
  return { type, offset, length, ...extra };
}

describe('entitiesToHtml', () => {
  it('returns plain (escaped) text with no entities', () => {
    expect(entitiesToHtml('a < b & c')).toBe('a &lt; b &amp; c');
  });

  it('wraps a simple bold entity', () => {
    expect(entitiesToHtml('hello', [entity('bold', 0, 5)])).toBe(
      '<b>hello</b>',
    );
  });

  it('nests entities (outer opens first, inner closes first)', () => {
    // "ab": bold over both, italic over "a"
    const html = entitiesToHtml('ab', [
      entity('bold', 0, 2),
      entity('italic', 0, 1),
    ]);
    expect(html).toBe('<b><i>a</i>b</b>');
  });

  it('keeps disjoint entities separate', () => {
    const html = entitiesToHtml('ab cd', [
      entity('bold', 0, 2),
      entity('italic', 3, 2),
    ]);
    expect(html).toBe('<b>ab</b> <i>cd</i>');
  });

  it('escapes text inside an entity', () => {
    expect(entitiesToHtml('a<b', [entity('bold', 0, 3)])).toBe('<b>a&lt;b</b>');
  });

  it('renders text_link with an escaped href', () => {
    const html = entitiesToHtml('site', [
      entity('text_link', 0, 4, { url: 'https://x.com/?a=1&b=2' }),
    ]);
    expect(html).toBe('<a href="https://x.com/?a=1&amp;b=2">site</a>');
  });

  it('renders pre with a language as nested code', () => {
    const html = entitiesToHtml('x=1', [
      entity('pre', 0, 3, { language: 'python' }),
    ]);
    expect(html).toBe('<pre><code class="language-python">x=1</code></pre>');
  });

  it('escapes the pre language attribute', () => {
    const html = entitiesToHtml('x', [
      entity('pre', 0, 1, { language: '"><script>' }),
    ]);
    expect(html).toBe(
      '<pre><code class="language-&quot;&gt;&lt;script&gt;">x</code></pre>',
    );
  });

  it('drops a crossing entity rather than emitting invalid tags', () => {
    // bold [0,3) and italic [1,4) cross — italic is left as plain text.
    const html = entitiesToHtml('abcd', [
      entity('bold', 0, 3),
      entity('italic', 1, 3),
    ]);
    expect(html).toBe('<b>abc</b>d');
  });

  it('leaves auto-detected entities (e.g. url) as plain text', () => {
    expect(entitiesToHtml('see x.com', [entity('url', 4, 5)])).toBe(
      'see x.com',
    );
  });
});

describe('htmlToEntities', () => {
  it('parses a simple bold tag', () => {
    expect(htmlToEntities('<b>hi</b>')).toEqual({
      text: 'hi',
      entities: [{ type: 'bold', offset: 0, length: 2 }],
    });
  });

  it('parses nested tags (inner closes first)', () => {
    expect(htmlToEntities('<b><i>a</i>b</b>')).toEqual({
      text: 'ab',
      entities: [
        { type: 'italic', offset: 0, length: 1 },
        { type: 'bold', offset: 0, length: 2 },
      ],
    });
  });

  it('maps tag aliases (strong/em/...) to entity types', () => {
    expect(htmlToEntities('<strong>x</strong>').entities[0].type).toBe('bold');
    expect(htmlToEntities('<em>x</em>').entities[0].type).toBe('italic');
  });

  it('decodes HTML references in text', () => {
    expect(htmlToEntities('a &lt;b&gt; &amp; c').text).toBe('a <b> & c');
  });

  it('parses a link with a decoded href', () => {
    expect(
      htmlToEntities('<a href="https://x.com/?a=1&amp;b=2">go</a>'),
    ).toEqual({
      text: 'go',
      entities: [
        {
          type: 'text_link',
          offset: 0,
          length: 2,
          url: 'https://x.com/?a=1&b=2',
        },
      ],
    });
  });

  it('parses pre with a language', () => {
    expect(
      htmlToEntities('<pre><code class="language-py">x=1</code></pre>'),
    ).toEqual({
      text: 'x=1',
      entities: [{ type: 'pre', offset: 0, length: 3, language: 'py' }],
    });
  });

  it('ignores unknown tags but keeps their text', () => {
    expect(htmlToEntities('<div>hi</div>')).toEqual({
      text: 'hi',
      entities: [],
    });
  });
});

describe('HTML round-trip (parse then serialize)', () => {
  const cases = [
    'plain text',
    'a &lt;b&gt; &amp; c',
    '<b>hi</b>',
    '<b><i>a</i>b</b>',
    '<b>ab</b> <i>cd</i>',
    '<a href="https://x.com/?a=1&amp;b=2">site</a>',
    '<pre><code class="language-python">x=1</code></pre>',
  ];

  for (const html of cases) {
    it(`round-trips: ${html}`, () => {
      const { text, entities } = htmlToEntities(html);
      expect(entitiesToHtml(text, entities)).toBe(html);
    });
  }
});
