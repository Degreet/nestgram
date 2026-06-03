import { Inject, Injectable } from '@nestjs/common';

import { BotOptions } from './bot-options';
import { InputFile } from './input-file';
import { Providers } from '../providers';
import { ApiException, NestgramError } from '../exceptions';
import { deepLink as createDeepLink, DeepLinkParams } from '../deep-links';
import type { User } from '../events/user';

import { ApiError, ApiResponse } from './api-response';
import { createAttachedData, createInlineData } from './form-data';
import { ApiRequest, RequestPipeline } from './request';
import {
  ApiMethod,
  SendMessage,
  GetMe,
  GetFile,
  GetFileOptions,
  GetUpdates,
  SendMessageOptions,
  GetUpdatesOptions,
  DeleteWebhookOptions,
  DeleteWebhook,
  AnswerCallbackQuery,
  AnswerCallbackQueryOptions,
  SendPhotoOptions,
  SendPhoto,
  SendMediaGroup,
  SendMediaGroupOptions,
  EditMessageText,
  EditMessageTextOptions,
  EditMessageReplyMarkup,
  EditMessageReplyMarkupOptions,
} from './methods';
import {
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from './input-media';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/** Per-call overrides for {@link BotService.call}, kept out of the API payload. */
export interface CallOptions {
  /** Send against a different bot token, without a second client instance. */
  token?: string;
  /** Abort the in-flight request (e.g. on shutdown or a timeout). */
  signal?: AbortSignal;
}

/**
 * A method's options plus the per-call controls (`token`, `signal`). The sugar
 * methods accept this and split the controls out of the payload, so one call can
 * target another bot or be aborted: `bot.sendMessage(id, 'hi', { token, signal })`.
 */
export type MethodOptions<T = unknown> = Partial<T> & CallOptions;

@Injectable()
export class BotService {
  readonly token: string;
  private cachedMe?: User;

  constructor(
    @Inject(Providers.BOT_OPTIONS) options: BotOptions,
    private readonly pipeline: RequestPipeline,
  ) {
    this.token = options.token;
  }

  /**
   * Execute any API method: build the request, run it through the request
   * pipeline (default parse mode, user transformers, ...), serialize, send, and
   * enrich the result. Every send funnels through here — the typed sugar below,
   * `message.answer(...)`, and a returned `new SendMessage(...)` alike — so a
   * transformer can never be bypassed.
   */
  async call<R>(
    method: ApiMethod<unknown, R>,
    options?: CallOptions,
  ): Promise<R> {
    const request: ApiRequest = {
      method: method.method,
      payload: { ...((method.payload as Record<string, unknown>) ?? {}) },
      token: options?.token ?? this.token,
    };
    await this.pipeline.run(request);

    const init = await this.serialize(method, request.payload);
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${request.token}/${request.method}`,
      { ...init, signal: options?.signal },
    );
    const data = (await response.json()) as ApiResponse<R>;

    if (!data.ok) {
      throw new ApiException(data as ApiError, request.payload);
    }
    return method.wrap ? method.wrap(data.result, this) : data.result;
  }

  /** Serialize a payload as JSON, or as form-data when the method carries files. */
  private async serialize(
    method: ApiMethod<unknown, unknown>,
    payload: Record<string, unknown>,
  ): Promise<RequestInit> {
    if (method.hasMedia) {
      return {
        method: 'POST',
        headers: { connection: 'keep-alive' },
        body: method.isAttachMedia
          ? await createAttachedData(payload)
          : await createInlineData(payload),
      };
    }
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', connection: 'keep-alive' },
      body: JSON.stringify(payload),
    };
  }

  deleteWebhook(options?: MethodOptions<DeleteWebhookOptions>) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(new DeleteWebhook(payload), { token, signal });
  }

  /**
   * The bot account. Its own identity (called without a custom token) is cached
   * after the first call — it is effectively static and backs {@link username}
   * and {@link deepLink}. Pass a `token` to query a different bot, always live.
   */
  async getMe(options?: MethodOptions): Promise<User> {
    const { token, signal } = options ?? {};
    if (!token && this.cachedMe) {
      return this.cachedMe;
    }

    const me = await this.call(new GetMe(), { token, signal });
    if (!token) {
      this.cachedMe = me;
    }
    return me;
  }

  /**
   * The bot's own `@username`, cached from `getMe`. Available once the bot has
   * started (the launch health check loads it) or after any `getMe()` call.
   */
  get username(): string {
    const username = this.cachedMe?.username;
    if (!username) {
      throw new NestgramError(
        "The bot's username is not loaded yet — it is available after startup " +
          '(the getMe health check) or once getMe() has been called.',
      );
    }
    return username;
  }

  /**
   * Build a deep link to THIS bot — the caller never needs to know or hard-code
   * the bot's `@username`; the framework already learned it via `getMe`.
   *
   * ```ts
   * bot.deepLink({ start: 'ref_42' }); // https://t.me/<this bot>?start=ref_42
   * ```
   *
   * For a link to another bot or a channel, use the standalone
   * `deepLink(username, …)`.
   */
  deepLink(params?: DeepLinkParams): string {
    return createDeepLink(this.username, params);
  }

  getFile(file_id: string, options?: MethodOptions<GetFileOptions>) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(new GetFile({ file_id, ...payload }), { token, signal });
  }

  getUpdates(options?: MethodOptions<GetUpdatesOptions>) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(new GetUpdates(payload), { token, signal });
  }

  sendMessage(
    chat_id: number | string,
    text: string,
    options?: MethodOptions<SendMessageOptions>,
  ) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(new SendMessage({ chat_id, text, ...payload }), {
      token,
      signal,
    });
  }

  sendPhoto(
    chat_id: number | string,
    photo: string | InputFile,
    options?: MethodOptions<SendPhotoOptions>,
  ) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(new SendPhoto({ chat_id, photo, ...payload }), {
      token,
      signal,
    });
  }

  sendMediaGroup(
    chat_id: number | string,
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: MethodOptions<SendMediaGroupOptions>,
  ) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(new SendMediaGroup({ chat_id, media, ...payload }), {
      token,
      signal,
    });
  }

  answerCallbackQuery(
    callback_query_id: string,
    options?: MethodOptions<AnswerCallbackQueryOptions>,
  ) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(
      new AnswerCallbackQuery({ callback_query_id, ...payload }),
      {
        token,
        signal,
      },
    );
  }

  editMessageText(
    chat_id: number | string,
    message_id: number,
    text: string,
    options?: MethodOptions<EditMessageTextOptions>,
  ) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(
      new EditMessageText({ chat_id, message_id, text, ...payload }),
      { token, signal },
    );
  }

  editMessageReplyMarkup(
    chat_id: number | string,
    message_id: number,
    reply_markup: unknown,
    options?: MethodOptions<EditMessageReplyMarkupOptions>,
  ) {
    const { token, signal, ...payload } = options ?? {};
    return this.call(
      new EditMessageReplyMarkup({
        chat_id,
        message_id,
        reply_markup,
        ...payload,
      }),
      { token, signal },
    );
  }
}
