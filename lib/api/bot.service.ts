import { Inject, Injectable } from '@nestjs/common';

import { BotOptions } from './bot-options';
import { InputFile } from './input-file';
import { Providers } from '../providers';
import { ApiException } from '../exceptions';

import { ApiError, ApiResponse } from './api-response';
import { createAttachedData, createInlineData } from './form-data';
import { ApiRequest, RequestPipeline } from './request';
import {
  ApiMethod,
  SendMessage,
  GetMe,
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

/** Per-call overrides for {@link BotService.call}. */
export interface CallOptions {
  /** Send against a different bot token, without a second client instance. */
  token?: string;
  /** Abort the in-flight request (used by long polling). */
  signal?: AbortSignal;
}

/**
 * A method's options plus an optional per-call `token` override. The sugar
 * methods accept this and split the `token` out of the payload, so a single
 * call can target another bot: `bot.sendMessage(id, 'hi', { token })`.
 */
export type WithToken<T = unknown> = Partial<T> & { token?: string };

@Injectable()
export class BotService {
  readonly token: string;

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

  deleteWebhook(options?: WithToken<DeleteWebhookOptions>) {
    const { token, ...payload } = options ?? {};
    return this.call(new DeleteWebhook(payload), { token });
  }

  getMe(options?: WithToken) {
    return this.call(new GetMe(), { token: options?.token });
  }

  getUpdates(options?: WithToken<GetUpdatesOptions>, signal?: AbortSignal) {
    const { token, ...payload } = options ?? {};
    return this.call(new GetUpdates(payload), { token, signal });
  }

  sendMessage(
    chat_id: number | string,
    text: string,
    options?: WithToken<SendMessageOptions>,
  ) {
    const { token, ...payload } = options ?? {};
    return this.call(new SendMessage({ chat_id, text, ...payload }), { token });
  }

  sendPhoto(
    chat_id: number | string,
    photo: string | InputFile,
    options?: WithToken<SendPhotoOptions>,
  ) {
    const { token, ...payload } = options ?? {};
    return this.call(new SendPhoto({ chat_id, photo, ...payload }), { token });
  }

  sendMediaGroup(
    chat_id: number | string,
    media: Array<
      InputMediaAudio | InputMediaDocument | InputMediaPhoto | InputMediaVideo
    >,
    options?: WithToken<SendMediaGroupOptions>,
  ) {
    const { token, ...payload } = options ?? {};
    return this.call(new SendMediaGroup({ chat_id, media, ...payload }), {
      token,
    });
  }

  answerCallbackQuery(
    callback_query_id: string,
    options?: WithToken<AnswerCallbackQueryOptions>,
  ) {
    const { token, ...payload } = options ?? {};
    return this.call(
      new AnswerCallbackQuery({ callback_query_id, ...payload }),
      {
        token,
      },
    );
  }

  editMessageText(
    chat_id: number | string,
    message_id: number,
    text: string,
    options?: WithToken<EditMessageTextOptions>,
  ) {
    const { token, ...payload } = options ?? {};
    return this.call(
      new EditMessageText({ chat_id, message_id, text, ...payload }),
      { token },
    );
  }

  editMessageReplyMarkup(
    chat_id: number | string,
    message_id: number,
    reply_markup: unknown,
    options?: WithToken<EditMessageReplyMarkupOptions>,
  ) {
    const { token, ...payload } = options ?? {};
    return this.call(
      new EditMessageReplyMarkup({
        chat_id,
        message_id,
        reply_markup,
        ...payload,
      }),
      { token },
    );
  }
}
