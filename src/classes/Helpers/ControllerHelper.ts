import { Api } from '../..';

export class ControllerHelper {
  constructor(private readonly api: Api) {}

  async getBotLink(query?: string): Promise<string | undefined> {
    const info = await this.api.getMe();
    if (!info) return;

    return `https://t.me/${info.username}${query ? `?start=${query}` : ''}`;
  }
}
