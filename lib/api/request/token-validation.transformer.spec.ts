import { Logger } from '@nestjs/common';

import { TokenValidationTransformer } from './token-validation.transformer';
import { ApiRequest } from './request.types';
import { BotOptions } from '../bot-options';
import { NestgramConfigError } from '../../exceptions';

function make(token: string): TokenValidationTransformer {
  return new TokenValidationTransformer({ token } as BotOptions);
}

function req(token: string): ApiRequest {
  return { method: 'sendMessage', payload: {}, token };
}

describe('TokenValidationTransformer', () => {
  describe('configured token (constructor, at boot)', () => {
    it('throws when the token is missing', () => {
      expect(() => make('')).toThrow(NestgramConfigError);
      expect(() => make('   ')).toThrow(NestgramConfigError);
    });

    it('warns when the token does not look like a Telegram token', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      make('not-a-token');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('Telegram token'),
      );
      warn.mockRestore();
    });

    it('stays silent for a well-formed token', () => {
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      make('123456:AA-bb_cc');
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('per-request token (transform)', () => {
    it('throws on an empty token (e.g. an empty per-call override)', () => {
      const transformer = make('123456:VALID');
      expect(() => transformer.transform(req(''))).toThrow(NestgramConfigError);
    });

    it('passes a present token through', () => {
      const transformer = make('123456:VALID');
      expect(() => transformer.transform(req('999:OTHER'))).not.toThrow();
    });
  });
});
