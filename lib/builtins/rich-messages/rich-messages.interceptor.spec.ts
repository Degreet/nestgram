import { of } from 'rxjs';

import { RichMessagesInterceptor } from './rich-messages.interceptor';
import { RichMessagesSettings } from './rich-messages.types';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiRequest,
} from '../../api/request';

const noop: ApiCallHandler = { handle: () => of(undefined) };

function context(
  method: string,
  payload: Record<string, unknown>,
): { ctx: ApiExecutionContext; request: ApiRequest } {
  const request: ApiRequest = { method, payload, token: 'T' };
  const ctx: ApiExecutionContext = {
    getRequest: () => request,
    getMethod: () => ({ method } as never),
    getSignal: () => undefined,
    getType: () => 'telegram:api',
  };
  return { ctx, request };
}

function run(
  settings: RichMessagesSettings | null,
  method: string,
  payload: Record<string, unknown>,
): ApiRequest {
  const interceptor = new RichMessagesInterceptor(settings);
  const { ctx, request } = context(method, payload);
  interceptor.intercept(ctx, noop); // mutation is synchronous
  return request;
}

function always(
  dialect: RichMessagesSettings['dialect'],
): RichMessagesSettings {
  return { dialect, mode: 'always' };
}

function dynamic(
  dialect: RichMessagesSettings['dialect'],
): RichMessagesSettings {
  return { dialect, mode: 'dynamic' };
}

describe('RichMessagesInterceptor', () => {
  it('rewrites sendMessage into sendRichMessage with the markdown dialect', () => {
    const request = run(always('markdown'), 'sendMessage', {
      chat_id: 1,
      text: '# hi',
    });
    expect(request.method).toBe('sendRichMessage');
    expect(request.payload).toEqual({
      chat_id: 1,
      rich_message: { markdown: '# hi' },
    });
  });

  it('uses the html dialect when configured', () => {
    const request = run(always('html'), 'sendMessage', {
      chat_id: 1,
      text: '<b>hi</b>',
    });
    expect(request.payload.rich_message).toEqual({ html: '<b>hi</b>' });
  });

  it('carries the rest of the payload over unchanged', () => {
    const markup = { inline_keyboard: [[{ text: 'x', callback_data: 'y' }]] };
    const request = run(always('markdown'), 'sendMessage', {
      chat_id: 1,
      text: 'hi',
      reply_markup: markup,
      reply_parameters: { message_id: 5 },
      disable_notification: true,
    });
    expect(request.payload).toEqual({
      chat_id: 1,
      rich_message: { markdown: 'hi' },
      reply_markup: markup,
      reply_parameters: { message_id: 5 },
      disable_notification: true,
    });
  });

  it('is a passthrough when the module was never imported (no settings)', () => {
    const request = run(null, 'sendMessage', { chat_id: 1, text: 'hi' });
    expect(request.method).toBe('sendMessage');
    expect(request.payload).toEqual({ chat_id: 1, text: 'hi' });
  });

  it.each(['parse_mode', 'entities', 'link_preview_options'])(
    'leaves a call with explicit %s untouched',
    (field) => {
      const request = run(always('markdown'), 'sendMessage', {
        chat_id: 1,
        text: 'hi',
        [field]: field === 'parse_mode' ? 'HTML' : {},
      });
      expect(request.method).toBe('sendMessage');
      expect(request.payload.text).toBe('hi');
      expect('rich_message' in request.payload).toBe(false);
    },
  );

  it('leaves non-text methods untouched', () => {
    const request = run(always('markdown'), 'sendPhoto', {
      chat_id: 1,
      photo: 'file-id',
      caption: 'hi',
    });
    expect(request.method).toBe('sendPhoto');
    expect('rich_message' in request.payload).toBe(false);
  });

  it('is idempotent under re-subscription (pipeline retry contract)', () => {
    const interceptor = new RichMessagesInterceptor(always('markdown'));
    const { ctx, request } = context('sendMessage', { chat_id: 1, text: 'hi' });
    interceptor.intercept(ctx, noop);
    interceptor.intercept(ctx, noop);
    expect(request.method).toBe('sendRichMessage');
    expect(request.payload).toEqual({
      chat_id: 1,
      rich_message: { markdown: 'hi' },
    });
  });

  describe('mode: dynamic', () => {
    it('leaves plain text alone', () => {
      const request = run(dynamic('markdown'), 'sendMessage', {
        chat_id: 1,
        text: 'just **bold** and a #hashtag',
      });
      expect(request.method).toBe('sendMessage');
      expect(request.payload.text).toBe('just **bold** and a #hashtag');
    });

    it('does not mistake a spoiler line for a table row', () => {
      const request = run(dynamic('markdown'), 'sendMessage', {
        chat_id: 1,
        text: '||spoiler||\n|just wrapped|',
      });
      expect(request.method).toBe('sendMessage');
    });

    it.each([
      ['a heading', '# Title\nbody'],
      ['a table row', 'see:\n| a | b |\n| 1 | 2 |'],
      ['a divider', 'above\n---\nbelow'],
    ])('rewrites markdown text with %s', (_label, text) => {
      const request = run(dynamic('markdown'), 'sendMessage', {
        chat_id: 1,
        text,
      });
      expect(request.method).toBe('sendRichMessage');
      expect(request.payload.rich_message).toEqual({ markdown: text });
    });

    it('rewrites html text with rich-only tags', () => {
      const request = run(dynamic('html'), 'sendMessage', {
        chat_id: 1,
        text: '<h1>Title</h1><p>body</p>',
      });
      expect(request.method).toBe('sendRichMessage');
    });

    it('leaves html text with only plain-formatting tags alone', () => {
      const request = run(dynamic('html'), 'sendMessage', {
        chat_id: 1,
        text: '<b>bold</b> and <i>italic</i>',
      });
      expect(request.method).toBe('sendMessage');
    });
  });
});
