import { IConfig, IUser, ControllerClass, ServiceClass, IHandler, MiddlewareFunction } from '.';
import { clear, error, log } from './logger';

import { Polling } from './classes/Launch/Polling';
import { Api } from './classes';

export class NestGram {
  handlers: IHandler[] = [];
  info: IUser;

  api: Api = new Api(this.token);
  polling: Polling;

  /**
   * Creates new bot
   * @param token Token for running bot that you can get in {@link https://t.me/BotFather}
   * @param config Config for getting updates {@link IConfig}
   * @param module Entry module
   * @param logging Toggle on logging on new updates
   * */
  constructor(
    private readonly token: string,
    private readonly module?: any,
    private readonly config?: IConfig,
    private readonly logging?: true,
  ) {
    // clear console
    clear();

    // log if logging is on
    if (logging) log('blue', 'Bot initialized');

    // if user set module call entry
    if (module) this.setupEntry(module);
  }

  private setupImports(Module: any): void {
    const controllers: ControllerClass[] = Reflect.getMetadata('controllers', Module);

    let services: ServiceClass[] = Reflect.getMetadata('services', Module);
    services = services.map((Service: any): typeof ServiceClass => new Service());

    controllers.forEach((Controller: any): void => {
      const controller: ControllerClass & { __proto__: any } = new Controller(...services);
      let methodKeys: (string | symbol)[] = Reflect.ownKeys(controller.__proto__);

      methodKeys = methodKeys.filter((key: string | symbol): boolean => typeof key === 'string');
      methodKeys = methodKeys.filter((key: string): boolean => key !== 'constructor');

      methodKeys.forEach((methodKey: string): void => {
        const middlewares: MiddlewareFunction[] =
          Reflect.getMetadata('middlewares', controller[methodKey]) || [];

        this.handlers.push({
          controller,
          methodKey,
          middlewares,
        });
      });
    });
  }

  private setupModule(Module: any): void {
    const imports: any[] | undefined = Reflect.getMetadata('imports', Module); // get imports in module
    if (imports) imports.forEach((ImportModule: any) => this.setupModule(ImportModule)); // import all
    this.setupImports(Module); // setup entry module
  }

  private setupEntry(Module: any): void {
    // setup entry module
    this.setupModule(Module);

    // log that module configured if logging is on
    if (this.logging) log('blue', 'Entry module configured');
  }

  /**
   * Starts bot using Long Polling or Webhooks
   * @return bot username
   * */
  async start(): Promise<string> {
    // log that bot starting if logging is on
    if (this.logging) log('blue', 'Starting bot...');

    // return error if user didn't set token
    if (!this.token) throw error(`You can't run bot without token`);

    // fetch bot info
    this.info = await this.api.call<IUser>(this.token, 'getMe');

    // start polling for handling updates
    this.polling = new Polling(this.token, this.handlers, this.config, this.logging);
    this.polling.start();

    // log that bot started
    log('green', 'Bot started on', `@${this.info.username}`.gray);

    // return bot.username
    return this.info.username;
  }
}
