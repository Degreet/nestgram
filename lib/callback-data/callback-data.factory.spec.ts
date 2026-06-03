import { Logger } from '@nestjs/common';

import { callbackData } from './callback-data.factory';
import { CallbackDataPredicate } from './callback-data.predicate';
import { NestgramConfigError } from '../exceptions/config.exception';

describe('callbackData', () => {
  describe('pack / parse round-trip', () => {
    it('encodes the prefix and a number, then decodes it back', () => {
      const Buy = callbackData('buy', { productId: Number });

      expect(Buy.pack({ productId: 42 })).toBe('buy:42');
      expect(Buy.parse('buy:42')).toEqual({ productId: 42 });
    });

    it('keeps field order from the schema', () => {
      const Nav = callbackData('nav', { page: Number, size: Number });

      expect(Nav.pack({ page: 2, size: 10 })).toBe('nav:2:10');
      expect(Nav.parse('nav:2:10')).toEqual({ page: 2, size: 10 });
    });

    it('round-trips a boolean as a single byte', () => {
      const Toggle = callbackData('t', { on: Boolean });

      expect(Toggle.pack({ on: true })).toBe('t:1');
      expect(Toggle.pack({ on: false })).toBe('t:0');
      expect(Toggle.parse('t:1')).toEqual({ on: true });
      expect(Toggle.parse('t:0')).toEqual({ on: false });
    });

    it('escapes the separator inside a string value and round-trips it', () => {
      const Open = callbackData('open', { path: String });

      const packed = Open.pack({ path: 'a:b:c' });
      expect(packed).toBe('open:a\\:b\\:c');
      expect(Open.parse(packed)).toEqual({ path: 'a:b:c' });
    });

    it('escapes the escape character itself', () => {
      const Open = callbackData('open', { path: String });

      const packed = Open.pack({ path: 'a\\b' });
      expect(Open.parse(packed)).toEqual({ path: 'a\\b' });
    });

    it('supports a payload-less definition', () => {
      const Menu = callbackData('menu');

      expect(Menu.pack()).toBe('menu');
      expect(Menu.parse('menu')).toEqual({});
    });
  });

  describe('parse rejection (returns null)', () => {
    const Buy = callbackData('buy', { productId: Number });

    it('rejects a different prefix', () => {
      expect(Buy.parse('sell:42')).toBeNull();
    });

    it('rejects the wrong number of fields', () => {
      expect(Buy.parse('buy:42:extra')).toBeNull();
      expect(Buy.parse('buy')).toBeNull();
    });

    it('rejects a value that does not fit its codec', () => {
      expect(Buy.parse('buy:notanumber')).toBeNull();
    });

    it('rejects non-canonical numbers it would never have packed', () => {
      // Forms `pack` never emits (hex, exponent, leading zero, whitespace,
      // infinity) must not match — keeps filter()/parse honest.
      expect(Buy.parse('buy:0x10')).toBeNull();
      expect(Buy.parse('buy:1e3')).toBeNull();
      expect(Buy.parse('buy:007')).toBeNull();
      expect(Buy.parse('buy: 5')).toBeNull();
      expect(Buy.parse('buy:Infinity')).toBeNull();
    });

    it('rejects an out-of-range boolean', () => {
      const Toggle = callbackData('t', { on: Boolean });
      expect(Toggle.parse('t:2')).toBeNull();
    });
  });

  describe('filter', () => {
    it('returns a CallbackDataPredicate bound to the definition', () => {
      const Buy = callbackData('buy', { productId: Number });
      expect(Buy.filter()).toBeInstanceOf(CallbackDataPredicate);
    });
  });

  describe('validation', () => {
    it('throws on an empty prefix', () => {
      expect(() => callbackData('')).toThrow(NestgramConfigError);
      expect(() => callbackData('   ')).toThrow(NestgramConfigError);
    });
  });

  describe('64-byte limit', () => {
    it('warns when packed data exceeds 64 bytes', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const Long = callbackData('x', { value: String });

      Long.pack({ value: 'a'.repeat(64) });

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('64');
      warn.mockRestore();
    });

    it('stays silent at or under 64 bytes', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      const Short = callbackData('x', { value: String });

      Short.pack({ value: 'a'.repeat(60) });

      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
