import { createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import { Inject, Injectable } from '@nestjs/common';
import { defer, from } from 'rxjs';

import { BotOptions } from './bot-options';
import { DEFAULT_BOT_NAME, Providers } from '../providers';
import { ApiException, NestgramError } from '../exceptions';
import { deepLink as createDeepLink, DeepLinkParams } from '../deep-links';
import type { User } from '../events/user';

import { ApiError, ApiResponse } from './api-response';
import { createAttachedData, createInlineData } from './form-data';
import { ApiCallContext, ApiPipeline, ApiRequest } from './request';
import { GeneratedBotMethods } from './generated-bot-methods';
import { ApiMethod, GetMe, GetFile, GetFileOptions } from './methods';

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
export class BotService extends GeneratedBotMethods {
  readonly token: string;
  private cachedMe?: User;

  constructor(
    @Inject(Providers.BOT_OPTIONS) options: BotOptions,
    private readonly pipeline: ApiPipeline,
    /**
     * This bot's configured name — the `@InjectBot(name)` / `@ForBot(name)` key,
     * `'default'` for the sole/default bot. Lets a handler tell which bot it is
     * serving (`ctx.bot.name`, `@ForBot`).
     */
    readonly name: string = DEFAULT_BOT_NAME,
  ) {
    super();
    this.token = options.token;
  }

  /**
   * Execute any API method: build the request, run it through the API
   * interceptor pipeline (token validation, default parse mode, throttling, and
   * any the user added), serialize, send, and enrich the result. Every call
   * funnels through here — the typed sugar below, `message.answer(...)`, and a
   * returned `new SendMessage(...)` alike — so an interceptor can't be bypassed.
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
    const context = new ApiCallContext(request, method, options?.signal);
    // Cold inner call: nothing goes out until the interceptor chain subscribes
    // it, and a retry re-subscribes it (re-fetch). The pipeline wraps it with the
    // built-in + user interceptors — the single chokepoint every call funnels
    // through, so none can be bypassed.
    const innerCall = defer(() =>
      from(this.send(method, request, options?.signal)),
    );
    return this.pipeline.run(context, innerCall);
  }

  /** Serialize, send, and enrich a finalized request — the cold innermost call
   * the interceptor pipeline wraps. */
  private async send<R>(
    method: ApiMethod<unknown, R>,
    request: ApiRequest,
    signal?: AbortSignal,
  ): Promise<R> {
    const init = await this.serialize(method, request.payload);
    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${request.token}/${request.method}`,
      { ...init, signal },
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

  /**
   * Resolve a fresh, temporary download URL for a file. `getFile`'s `file_path`
   * is short-lived, so this re-resolves it every call — there is no stale-link
   * window. Throws if the file is too large to download (no `file_path`).
   */
  async fileLink(fileId: string, options?: CallOptions): Promise<string> {
    const token = options?.token ?? this.token;
    const file = await this.getFile(fileId, options);
    if (!file.file_path) {
      throw new NestgramError(
        `getFile returned no file_path for "${fileId}" ` +
          '(the file may be too large to download)',
      );
    }
    return `${TELEGRAM_API_BASE}/file/bot${token}/${file.file_path}`;
  }

  /** Open a file as a readable stream by its `file_id` (preferred for large files). */
  async fileStream(fileId: string, options?: CallOptions): Promise<Readable> {
    const response = await this.fetchFile(fileId, options);
    if (!response.body) {
      throw new NestgramError(`Empty download body for "${fileId}"`);
    }
    return Readable.fromWeb(
      response.body as Parameters<typeof Readable.fromWeb>[0],
    );
  }

  /** Read a whole file into a Buffer by its `file_id`. */
  async fileBuffer(fileId: string, options?: CallOptions): Promise<Buffer> {
    const response = await this.fetchFile(fileId, options);
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Download a file by its `file_id` straight to a local path — the file_id
   * pattern: a service injects `BotService` and saves without a rich event.
   */
  async download(
    fileId: string,
    destinationPath: string,
    options?: CallOptions,
  ): Promise<void> {
    const stream = await this.fileStream(fileId, options);
    try {
      await pipeline(stream, createWriteStream(destinationPath));
    } catch (error) {
      // Don't leave a truncated file behind if the download fails mid-stream.
      await rm(destinationPath, { force: true });
      throw error;
    }
  }

  private async fetchFile(
    fileId: string,
    options?: CallOptions,
  ): Promise<Response> {
    const link = await this.fileLink(fileId, options);
    const response = await fetch(link, { signal: options?.signal });
    if (!response.ok) {
      throw new NestgramError(
        `Failed to download "${fileId}": ${response.status} ${response.statusText}`,
      );
    }
    return response;
  }
}
