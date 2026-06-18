import { Logger } from '@nestjs/common';

import { CallbackRoutePattern } from './callback-route-pattern';
import { NestgramConfigError } from '../exceptions/config.exception';

describe('CallbackRoutePattern', () => {
  describe('match', () => {
    it('captures parameters from a matching wire value', () => {
      const pattern = CallbackRoutePattern.compile('done/:id');
      expect(pattern.match('done/42')).toEqual({ id: '42' });
    });

    it('matches a literal-only route exactly', () => {
      const pattern = CallbackRoutePattern.compile('refresh');
      expect(pattern.match('refresh')).toEqual({});
      expect(pattern.match('refresh/extra')).toBeNull();
      expect(pattern.match('other')).toBeNull();
    });

    it('treats a colon mid-segment as a literal, not a parameter', () => {
      const pattern = CallbackRoutePattern.compile('menu:open');
      expect(pattern.match('menu:open')).toEqual({});
      expect(pattern.match('menu/open')).toBeNull();
    });

    it('rejects a value with a different segment count', () => {
      const pattern = CallbackRoutePattern.compile('done/:id');
      expect(pattern.match('done')).toBeNull();
      expect(pattern.match('done/1/2')).toBeNull();
    });

    it('captures multiple parameters', () => {
      const pattern = CallbackRoutePattern.compile('move/:from/:to');
      expect(pattern.match('move/a/b')).toEqual({ from: 'a', to: 'b' });
    });
  });

  describe('build', () => {
    it('substitutes parameter values', () => {
      const pattern = CallbackRoutePattern.compile('done/:id');
      expect(pattern.build({ id: 42 })).toBe('done/42');
    });

    it('round-trips a value containing the separator', () => {
      const pattern = CallbackRoutePattern.compile('open/:slug');
      const data = pattern.build({ slug: 'a/b' });
      expect(data).toBe('open/a\\/b');
      expect(pattern.match(data)).toEqual({ slug: 'a/b' });
    });

    it('round-trips a value containing the escape character', () => {
      const pattern = CallbackRoutePattern.compile('open/:slug');
      const data = pattern.build({ slug: 'a\\b' });
      expect(pattern.match(data)).toEqual({ slug: 'a\\b' });
    });

    it('round-trips an empty parameter value', () => {
      const pattern = CallbackRoutePattern.compile('open/:slug');
      const data = pattern.build({ slug: '' });
      expect(data).toBe('open/');
      expect(pattern.match(data)).toEqual({ slug: '' });
    });

    it('throws when a parameter value is missing', () => {
      const pattern = CallbackRoutePattern.compile('done/:id');
      expect(() => pattern.build({})).toThrow(NestgramConfigError);
    });
  });

  describe('64-byte limit', () => {
    it('warns when assembled data exceeds 64 bytes', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      CallbackRoutePattern.build('open/:slug', { slug: 'a'.repeat(64) });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('64');
      warn.mockRestore();
    });

    it('stays silent at or under 64 bytes', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

      CallbackRoutePattern.build('open/:slug', { slug: 'short' });

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('withPrefix', () => {
    it('prepends the prefix segments', () => {
      const pattern =
        CallbackRoutePattern.compile('done/:id').withPrefix('reminder');
      expect(pattern.source).toBe('reminder/done/:id');
      expect(pattern.match('reminder/done/7')).toEqual({ id: '7' });
      expect(pattern.match('done/7')).toBeNull();
    });

    it('supports a multi-segment prefix', () => {
      const pattern = CallbackRoutePattern.compile('done').withPrefix('a/b');
      expect(pattern.match('a/b/done')).toEqual({});
    });

    it('throws when the prefix repeats a route parameter', () => {
      expect(() =>
        CallbackRoutePattern.compile('done/:id').withPrefix('ns/:id'),
      ).toThrow(NestgramConfigError);
    });
  });

  describe('compile validation', () => {
    it('rejects an empty segment', () => {
      expect(() => CallbackRoutePattern.compile('done//x')).toThrow(
        NestgramConfigError,
      );
    });

    it('rejects an invalid parameter name', () => {
      expect(() => CallbackRoutePattern.compile('done/:1id')).toThrow(
        NestgramConfigError,
      );
    });

    it('rejects a repeated parameter name', () => {
      expect(() => CallbackRoutePattern.compile('swap/:id/:id')).toThrow(
        NestgramConfigError,
      );
    });
  });

  describe('source', () => {
    it('reproduces the template', () => {
      expect(CallbackRoutePattern.compile('reminder/done/:id').source).toBe(
        'reminder/done/:id',
      );
    });
  });
});
