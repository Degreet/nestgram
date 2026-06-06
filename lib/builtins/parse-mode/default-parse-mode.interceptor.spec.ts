import { Logger } from '@nestjs/common';
import { of } from 'rxjs';

import { DefaultParseModeInterceptor } from './default-parse-mode.interceptor';
import { ApiCallHandler, ApiExecutionContext } from '../../api/request';
import { ApiRequest } from '../../api/request';

const noop: ApiCallHandler = { handle: () => of(undefined) };

function context(
  method: string,
  payload: Record<string, unknown>,
): {
  ctx: ApiExecutionContext;
  request: ApiRequest;
} {
  const request: ApiRequest = { method, payload, token: 'T' };
  const ctx: ApiExecutionContext = {
    getRequest: () => request,
    getMethod: () => ({ method }),
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
  return { ctx, request };
}

function run(
  defaultParseMode: string | undefined,
  method: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const interceptor = new DefaultParseModeInterceptor({
    parseMode: defaultParseMode,
  });
  const { ctx, request } = context(method, payload);
  interceptor.intercept(ctx, noop); // mutation is synchronous
  return request.payload;
}

describe('DefaultParseModeInterceptor', () => {
  it('injects the default on a text send that omits parse_mode', () => {
    expect(run('HTML', 'sendMessage', { text: 'hi' }).parse_mode).toBe('HTML');
  });

  it('injects the default on a caption send', () => {
    expect(run('HTML', 'sendPhoto', { caption: 'hi' }).parse_mode).toBe('HTML');
  });

  it('leaves non-formattable methods untouched', () => {
    expect('parse_mode' in run('HTML', 'getUpdates', { offset: 1 })).toBe(
      false,
    );
  });

  it('does not override an explicit parse_mode', () => {
    expect(
      run('HTML', 'sendMessage', { text: 'hi', parse_mode: 'MarkdownV2' })
        .parse_mode,
    ).toBe('MarkdownV2');
  });

  it('does not inject when entities are present', () => {
    const payload = run('HTML', 'sendMessage', {
      text: 'hi',
      entities: [{ type: 'bold', offset: 0, length: 2 }],
    });
    expect('parse_mode' in payload).toBe(false);
  });

  it('does not inject when caption_entities are present', () => {
    const payload = run('HTML', 'sendPhoto', {
      caption: 'hi',
      caption_entities: [{ type: 'bold', offset: 0, length: 2 }],
    });
    expect('parse_mode' in payload).toBe(false);
  });

  it('does nothing when no default is configured', () => {
    expect('parse_mode' in run(undefined, 'sendMessage', { text: 'hi' })).toBe(
      false,
    );
  });

  it('warns when a call supplies both parse_mode and entities', () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);

    run(undefined, 'sendMessage', {
      text: 'hi',
      parse_mode: 'HTML',
      entities: [{ type: 'bold', offset: 0, length: 2 }],
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('parse_mode'));
    warn.mockRestore();
  });
});
