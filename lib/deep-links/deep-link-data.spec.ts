import { deepLinkData } from './deep-link-data';
import { deepLink } from './deep-link';
import { NestgramConfigError } from '../exceptions/config.exception';

describe('deepLinkData', () => {
  describe('pack / parse round-trip', () => {
    it('encodes and decodes a number field', () => {
      const Ref = deepLinkData('ref', { userId: Number });
      expect(Ref.pack({ userId: 42 })).toBe('ref_42');
      expect(Ref.parse('ref_42')).toEqual({ userId: 42 });
    });

    it('handles a negative number (no collision with the _ separator)', () => {
      const Chat = deepLinkData('c', { id: Number });
      const packed = Chat.pack({ id: -100 });
      expect(packed).toBe('c_-100');
      expect(Chat.parse(packed)).toEqual({ id: -100 });
    });

    it('encodes multiple fields in order, including a boolean', () => {
      const D = deepLinkData('d', { page: Number, pro: Boolean });
      expect(D.pack({ page: 2, pro: true })).toBe('d_2_1');
      expect(D.parse('d_2_1')).toEqual({ page: 2, pro: true });
    });

    it('supports a payload-less marker', () => {
      const Promo = deepLinkData('promo');
      expect(Promo.pack()).toBe('promo');
      expect(Promo.parse('promo')).toEqual({});
    });
  });

  describe('parse rejection (returns null)', () => {
    const Ref = deepLinkData('ref', { userId: Number });

    it('rejects a different prefix', () => {
      expect(Ref.parse('other_1')).toBeNull();
    });

    it('rejects the wrong number of fields', () => {
      expect(Ref.parse('ref_1_2')).toBeNull();
      expect(Ref.parse('ref')).toBeNull();
    });

    it('rejects a non-number value', () => {
      expect(Ref.parse('ref_abc')).toBeNull();
    });

    it('rejects non-canonical numbers', () => {
      expect(Ref.parse('ref_007')).toBeNull();
      expect(Ref.parse('ref_0x1')).toBeNull();
    });
  });

  describe('charset safety', () => {
    const Ref = deepLinkData('ref', { userId: Number });

    it('refuses to pack a non-integer number (would break the link)', () => {
      expect(() => Ref.pack({ userId: 0.5 })).toThrow(NestgramConfigError);
      expect(() => Ref.pack({ userId: 1e21 })).toThrow(NestgramConfigError);
    });

    it('packs only into the deep-link charset', () => {
      // Negative ids stay charset-safe (the "-" is allowed; "_" is the separator).
      expect(deepLink('mybot', { start: Ref.pack({ userId: -7 }) })).toBe(
        'https://t.me/mybot?start=ref_-7',
      );
    });
  });

  describe('prefix validation', () => {
    it('throws on an empty prefix', () => {
      expect(() => deepLinkData('')).toThrow(NestgramConfigError);
    });

    it('throws on a prefix containing the separator', () => {
      expect(() => deepLinkData('a_b')).toThrow(NestgramConfigError);
    });

    it('throws on a prefix with an out-of-charset character', () => {
      expect(() => deepLinkData('a:b')).toThrow(NestgramConfigError);
    });
  });

  it('produces a deep-link-safe value usable straight in deepLink()', () => {
    const Ref = deepLinkData('ref', { userId: Number });
    expect(deepLink('mybot', { start: Ref.pack({ userId: 42 }) })).toBe(
      'https://t.me/mybot?start=ref_42',
    );
  });
});
