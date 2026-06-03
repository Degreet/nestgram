import { Logger } from '@nestjs/common';

import { deepLink } from './deep-link';

describe('deepLink', () => {
  describe('building', () => {
    it('builds the bare profile link with no params', () => {
      expect(deepLink('mybot')).toBe('https://t.me/mybot');
    });

    it('builds a start (referral) link', () => {
      expect(deepLink('mybot', { start: 'ref_42' })).toBe(
        'https://t.me/mybot?start=ref_42',
      );
    });

    it('coerces a number param', () => {
      expect(deepLink('mybot', { start: 42 })).toBe(
        'https://t.me/mybot?start=42',
      );
    });

    it('maps startGroup to the startgroup query key', () => {
      expect(deepLink('mybot', { startGroup: 'token' })).toBe(
        'https://t.me/mybot?startgroup=token',
      );
    });

    it('maps startApp to the startapp query key', () => {
      expect(deepLink('mybot', { startApp: 'promo' })).toBe(
        'https://t.me/mybot?startapp=promo',
      );
    });

    it('strips a leading @ from the username', () => {
      expect(deepLink('@mybot', { start: 'x' })).toBe(
        'https://t.me/mybot?start=x',
      );
    });

    it('rejects more than one variant at compile time (runtime: first wins)', () => {
      // @ts-expect-error - exactly one of start / startGroup / startApp is allowed
      const link = deepLink('mybot', { start: 'a', startApp: 'b' });
      expect(link).toBe('https://t.me/mybot?start=a');
    });
  });

  describe('validation (warns, still returns)', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('warns on rejected characters but still builds the link', () => {
      const link = deepLink('mybot', { start: 'has space' });
      expect(link).toBe('https://t.me/mybot?start=has space');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain('rejects');
    });

    it('allows start up to 64 chars (no warn at 64)', () => {
      deepLink('mybot', { start: 'a'.repeat(64) });
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns when start exceeds 64 chars', () => {
      deepLink('mybot', { start: 'a'.repeat(65) });
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('allows startApp up to 512 chars (no warn at 65)', () => {
      deepLink('mybot', { startApp: 'a'.repeat(65) });
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns when startApp exceeds 512 chars', () => {
      deepLink('mybot', { startApp: 'a'.repeat(513) });
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it('stays silent for a valid base64url-style param', () => {
      deepLink('mybot', { start: 'aB9_-xy' });
      expect(warn).not.toHaveBeenCalled();
    });

    it('warns on an empty username', () => {
      deepLink('');
      expect(warn).toHaveBeenCalledTimes(1);
    });
  });
});
