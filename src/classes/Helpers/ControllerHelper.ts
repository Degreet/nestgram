import { Api } from '../..';

export class ControllerHelper {
  constructor(private readonly api: Api) {}

  /**
   * Get link to the current bot
   * @param query Query that you can pass to the link
   * @return link to the bot
   * */
  async getBotLink(query?: string): Promise<string | undefined> {
    const info = await this.api.getMe();
    if (!info) return;

    return `https://t.me/${info.username}${query ? `?start=${query}` : ''}`;
  }
}
