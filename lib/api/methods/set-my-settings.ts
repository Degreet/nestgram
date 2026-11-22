import { ApiMethod } from './api-method';

export interface SetMySettingsOptions {
  supports_inline_queries?: boolean;
  inline_query_placeholder?: string;
  needs_inline_query_location?: boolean;
  inline_feedback_share_denominator?: number;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  can_connect_to_business?: boolean;
  can_manage_bots?: boolean;
  supports_guest_queries?: boolean;
  supports_join_request_queries?: boolean;
  has_topics_enabled?: boolean;
  allows_users_to_create_topics?: boolean;
  has_topic_sidebar?: boolean;
  can_communicate_with_bots?: boolean;
  callback_query_mode?: string;
}

/**
 * Use this method to change settings of the bot. Settings that aren't specified remain unchanged. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmysettings
 */
export class SetMySettings extends ApiMethod<SetMySettingsOptions, true> {
  readonly method = 'setMySettings';

  constructor(payload?: SetMySettingsOptions) {
    super(payload);
  }
}
