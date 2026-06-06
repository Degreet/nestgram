export interface ApiError {
  ok: false;
  error_code: number;
  description: string;
  parameters?: ResponseParameters;
}

export interface ApiSuccess<T> {
  ok: true;
  result: T;
}

export type ApiResponse<T> = ApiError | ApiSuccess<T>;

export interface ResponseParameters {
  migrate_to_chat_id?: number;
  retry_after?: number;
  /** Scope of a 429 limit (Bot API 7.8): 'chat' affects one chat, 'global' the bot. */
  scope?: 'chat' | 'global';
}
