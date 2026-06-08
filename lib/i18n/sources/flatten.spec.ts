import { flattenCatalog } from './flatten';

describe('flattenCatalog', () => {
  it('dots nested keys and coerces leaf values to strings', () => {
    expect(
      flattenCatalog({
        start: 'Hi',
        cart: { empty: 'Empty', total: 42 },
        menu: { nested: { deep: 'x' } },
      }),
    ).toEqual({
      start: 'Hi',
      'cart.empty': 'Empty',
      'cart.total': '42',
      'menu.nested.deep': 'x',
    });
  });

  it('joins an array leaf with newlines (multi-line template)', () => {
    expect(flattenCatalog({ help: ['line 1', 'line 2'] })).toEqual({
      help: 'line 1\nline 2',
    });
  });

  it('returns an empty map for a non-object', () => {
    expect(flattenCatalog('nope')).toEqual({});
    expect(flattenCatalog(null)).toEqual({});
  });
});
