import { ApiMethod } from './api-method';

export interface PromoteChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  is_anonymous?: boolean;
  can_manage_chat?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_post_stories?: boolean;
  can_edit_stories?: boolean;
  can_delete_stories?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  can_manage_direct_messages?: boolean;
  can_manage_tags?: boolean;
}

export class PromoteChatMember extends ApiMethod<
  PromoteChatMemberOptions,
  true
> {
  readonly method = 'promoteChatMember';

  constructor(payload: PromoteChatMemberOptions) {
    super(payload);
  }
}
