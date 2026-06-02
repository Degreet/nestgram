import { entitiesToHtml } from './html';
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
