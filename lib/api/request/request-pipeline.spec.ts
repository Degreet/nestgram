import { Logger } from '@nestjs/common';

import { RequestPipeline } from './request-pipeline';
import { DefaultParseModeTransformer } from './default-parse-mode.transformer';
import { ApiRequest, RequestTransformer } from './request.types';

function request(method: string, payload: Record<string, unknown>): ApiRequest {
  return { method, payload, token: 'T' };
}

describe('RequestPipeline', () => {
  it('runs transformers in order', async () => {
    const order: string[] = [];
    const make = (name: string): RequestTransformer => ({
      transform: (req) => {
        order.push(name);
        (req.payload[name] as unknown) = true;
      },
    });
    const pipeline = new RequestPipeline([make('a'), make('b')]);

    const result = await pipeline.run(request('sendMessage', {}));

    expect(order).toEqual(['a', 'b']);
    expect(result.payload).toEqual({ a: true, b: true });
  });

  it('is a no-op with no transformers registered', async () => {
    const pipeline = new RequestPipeline(null);
    const req = request('sendMessage', { text: 'hi' });
    expect(await pipeline.run(req)).toBe(req);
  });

  it('awaits async transformers', async () => {
    const pipeline = new RequestPipeline([
      {
        transform: async (req) => {
          await Promise.resolve();
          req.payload.touched = true;
        },
      },
    ]);
    const result = await pipeline.run(request('sendMessage', {}));
    expect(result.payload.touched).toBe(true);
  });
});

describe('DefaultParseModeTransformer', () => {
  const run = (
    defaultParseMode: string | undefined,
    method: string,
    payload: Record<string, unknown>,
  ): Record<string, unknown> => {
    const transformer = new DefaultParseModeTransformer({
      parseMode: defaultParseMode,
    });
    const req = request(method, payload);
    transformer.transform(req);
    return req.payload;
  };

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
