# What is Nestgram?

Nestgram - Framework for working with Telegram Bot API on TypeScript like Nest.js

> ℹ️ Nestgram in development. Current version is **1.8.7** <br>
> If you found a bug, you can ask the [author](https://t.me/degreet) or ask the [form](https://do67hlsz91r.typeform.com/to/sI6NXBKV)

> ⚠️ Nestgram can't use Nest.js modules. But you can create own modules for Nestgram :)

# Links

- [Official website](https://degreetpro.gitbook.io/nestgram/)
- [GitHub](https://github.com/Degreet/nestgram)
- [Author](https://t.me/degreet)
- Our telegram channels:
  - 🇺🇦 [Channel](https://t.me/nestgram_ts)
  - 🇺🇸 [Channel](https://t.me/nestgram_en)

# Guide

You can read the [guide on the official Nestgram website](https://degreetpro.gitbook.io/nestgram/getting-started/guide), on [Medium website](https://medium.com/p/ff251fb825fd) or here

## Install Nestgram

You need to install nestgram at first. You can do this using yarn or npm

```nginx
yarn add nestgram
// or
npm i nestgram
```

## Create main file

Our next step is creating the main file, so let's create the `main.ts` file

```typescript
import { NestGram } from 'nestgram';
import { AppModule } from './app/app.module';

async function bootstrap(): Promise<void> {
  const bot = new NestGram('TOKEN', AppModule);
  await bot.start();
}

bootstrap();
```

At first, we imported nestgram and our `AppModule`, later we will create it. In the next step, we created a bootstrap function, in which we set up and run the project. The `NestGram` class takes arguments:

| Argument | Name                                                                                                                                      | Required     |
|:---------|:------------------------------------------------------------------------------------------------------------------------------------------|:-------------|
| 1        | Bot token. You can get it [here](https://t.me/BotFather)                                                                                  | **Required** |
| 2        | [App module](#create-app.module.ts)                                                                                                       | **Required** |
| 3        | Config [IPollingConfig](https://core.telegram.org/bots/api#getupdates) or [IWebhookConfig](https://core.telegram.org/bots/api#setwebhook) | Optional     |
| 4        | [Run config](https://degreetpro.gitbook.io/nestgram/config/webhooks-and-run-config#run-config)                                            | Optional     |

## Create app.module.ts

Let's create the `app.module.ts` file. In it, we will describe all available controllers and services

```typescript
import { Module } from 'nestgram';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  controllers: [AppController],
  services: [AppService],
})
export class AppModule {}
```

At first, we imported Module class from nestgram, `AppController` and `AppService` also, that we will create later. Then we described our controllers and services in `@Module` decorator

## Create app.controller.ts

Let's create the `app.controller.ts` file. In it, we will describe updates, that we want to handle

```typescript
import { OnCommand, Controller } from 'nestgram';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService?: AppService) {}

  @OnCommand('start')
  start(): string {
    return 'Hello, world!';
  }
}
```

We have created a controller where we describe an update when the user writes `/start`, and we handle it by sending a message `Hello, world!`

## Create app.service.ts

Let's create the `app.service.ts` file. In it, we will describe methods with working with db, that we will call in controller

```typescript
import { Service } from 'nestgram';

@Service()
export class AppService {}
```

We can describe methods in `AppService` class, and call it in controller by `this.appService`

## Run project

To run the project, open a terminal in the project directory and type:

```nginx
npm run dev
```

Or build and run production:

```nginx
npm run build && npm run prod
```

# What’s next?

Now you know about the syntax and structure of the Nestgram project, but if you want to write your own pro bot, you can check out the [Nestgram documentation](https://degreetpro.gitbook.io/nestgram/)

# Found a bug?

You can ask the [author](https://t.me/degreet) or ask the [form](https://do67hlsz91r.typeform.com/to/sI6NXBKV?typeform-source=admin.typeform.com)
