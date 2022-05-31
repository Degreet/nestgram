import { IConfig, IHandler, IUpdate } from '../../types';
import { error, log } from '../../logger';
import { Handler } from './Handler';
import { Api } from '../Api';

export class Polling {
  api: Api = new Api();
  handler: Handler = new Handler(this.token, this.handlers, this.logging);

  constructor(
    private readonly token: string,
    private readonly handlers: IHandler[],
    private readonly config?: IConfig | null,
    private readonly logging?: true,
  ) {
    if (!this.token) throw error(`You can't run bot without token`);
  }

  public async start(): Promise<void> {
    for await (const updates of this.updateGetter()) {
      for (const update of await updates) {
        // log got new update
        if (this.logging) log('blue', 'Got new update!', `(${update.update_id})`.grey);

        // handle got update
        await this.handler.handleUpdate(update);

        // mark update as read
        await this.api.call(this.token, 'getUpdates', {
          ...(this.config || {}),
          offset: update.update_id + 1,
        });
      }
    }
  }

  private async *updateGetter(): AsyncIterableIterator<Promise<any>> {
    while (true) {
      const updates = await this.api.call<IUpdate, IConfig>(this.token, 'getUpdates', this.config);
      yield updates;
    }
  }
}
