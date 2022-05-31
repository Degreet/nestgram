import { IMessage, IUpdate } from '../..';

export class Filter {
  /**
   * @param update Update {@link IUpdate}
   * @return chat id from sent message
   * */
  public static getChatId(update: IUpdate): number | string | undefined {
    return Filter.getMessage(update)?.chat?.id;
  }

  /**
   * @param update Update {@link IUpdate}
   * @return message from update
   * */
  public static getMessage(update: IUpdate): IMessage | undefined {
    return (
      update.message || update.edited_message || update.channel_post || update.edited_channel_post
    );
  }
}
