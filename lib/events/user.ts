/**
 * A Telegram user or bot. The shape the framework exposes for senders and other
 * people in an update — reachable on events and via `@Sender()`.
 *
 * @see https://core.telegram.org/bots/api#user
 */
export interface User {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  added_to_attachment_menu?: boolean;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
  can_connect_to_business?: boolean;
  has_main_web_app?: boolean;
}
