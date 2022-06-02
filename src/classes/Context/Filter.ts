import { IMessage, IMessageEntity, IUpdate, MessageEntityTypes } from '../..';

export class Filter {
  public static commandParamsRegExp = /\/.*? (.*)/;

  /**
   * @param update Update {@link IUpdate}
   * @return chat id from sent message
   * */
  public static getChatId(update: IUpdate): number | string | undefined {
    return Filter.getMessage(update)?.chat?.id;
  }

  /**
   * @param update Update {@link IUpdate}
   * @return callback query id
   * */
  public static getCallbackQueryId(update: IUpdate): string | undefined {
    return update.callback_query?.id;
  }

  /**
   * @param update Update {@link IUpdate}
   * @return message from update
   * */
  public static getMessage(update: IUpdate): IMessage | undefined {
    return (
      update.message ||
      update.edited_message ||
      update.channel_post ||
      update.edited_channel_post ||
      update.callback_query?.message
    );
  }

  /**
   * @param update Update {@link IUpdate}
   * @param entityType Entity type {@link MessageEntityTypes}
   * @return entity bot command
   * */
  public static getEntity(
    update: IUpdate,
    entityType: MessageEntityTypes,
  ): IMessageEntity | undefined {
    return Filter.getMessage(update).entities.find(
      (entity: IMessageEntity) => entity.type === entityType,
    );
  }

  /**
   * @param update Update {@link IUpdate}
   * @return command params
   * */
  public static getCommandParams(update: IUpdate): string[] {
    const message: IMessage | undefined = Filter.getMessage(update);
    if (!message) return [];

    const match: RegExpMatchArray = message.text.match(Filter.commandParamsRegExp);
    if (!match) return [];

    return match[1].split(' ') || [];
  }
}
