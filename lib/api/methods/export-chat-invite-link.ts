import { ApiMethod } from './api-method';

export interface ExportChatInviteLinkOptions {
  chat_id: number | string;
}

export class ExportChatInviteLink extends ApiMethod<
  ExportChatInviteLinkOptions,
  string
> {
  readonly method = 'exportChatInviteLink';

  constructor(payload: ExportChatInviteLinkOptions) {
    super(payload);
  }
}
