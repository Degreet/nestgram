import { Logger } from '@nestjs/common';
import { of } from 'rxjs';

import { TokenValidationInterceptor } from './token-validation.interceptor';
import { ApiCallHandler, ApiExecutionContext } from './api-interceptor.types';
import { ApiRequest } from './request.types';
import { BotOptions } from '../bot-options';
import { NestgramConfigError } from '../../exceptions';

const noop: ApiCallHandler = { handle: () => of(undefined) };

function make(token: string): TokenValidationInterceptor {
  return new TokenValidationInterceptor({ token } as BotOptions);
}

function ctx(token: string): ApiExecutionContext {
  const request: ApiRequest = { method: 'sendMessage', payload: {}, token };
  return {
    getRequest: () => request,
    getMethod: () => ({ method: 'sendMessage' }),
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
}

describe('TokenValidationInterceptor', () => {
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

  describe('per-request token (intercept)', () => {
    it('throws on an empty token (e.g. an empty per-call override)', () => {
      const interceptor = make('123456:VALID');
      expect(() => interceptor.intercept(ctx(''), noop)).toThrow(
        NestgramConfigError,
      );
    });

    it('passes a present token through', () => {
      const interceptor = make('123456:VALID');
      expect(() => interceptor.intercept(ctx('999:OTHER'), noop)).not.toThrow();
    });
  });
});
