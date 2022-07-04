import { MarkCreator } from './MarkCreator';
import { IEditInviteLinkOptions } from '../../types';

export class InviteLink extends MarkCreator {
  /**
   * New chat invite link wrapper
   * @param inviteLink Invite link you want to edit
   * @param options Options you want to edit. {@link IEditInviteLinkOptions}
   * */
  constructor(public readonly inviteLink: string, public readonly options: IEditInviteLinkOptions) {
    super();
  }
}
