import { escapeHtml } from './escape';

describe('escapeHtml', () => {
  it('escapes the three HTML-sensitive characters', () => {
    expect(escapeHtml('1 < 2 > 0 & true')).toBe('1 &lt; 2 &gt; 0 &amp; true');
  });

  it('escapes & first, so an entity-looking input is not double-escaped', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('leaves text with no sensitive characters untouched', () => {
    expect(escapeHtml('Hello, world! 123 — ok 🚀')).toBe(
      'Hello, world! 123 — ok 🚀',
    );
  });

  it('neutralises a tag-injection attempt', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });
});
