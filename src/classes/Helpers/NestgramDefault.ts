import { IChatPermissions } from '../../types';

export class NestgramDefault {
  static get chatPermissions(): IChatPermissions {
    return {
      can_send_messages: true,
      can_send_media_messages: true,
      can_send_polls: true,
      can_send_other_messages: true,
      can_add_web_page_previews: true,
      can_invite_users: true,
      can_change_info: false,
      can_pin_messages: false,
    };
  }
}
