import {
  Router,
  Command,
  Hears,
  Action,
  OnMessage,
  Message,
  CallbackQuery,
  Sender,
  User,
  InlineKeyboard,
  SceneContext,
  SceneCtx,
  NoScene,
} from 'nestgram';

import { FeedbackScene } from './feedback.scene';

/**
 * A small bot showing the everyday Nestgram surface: commands, text and
 * callback matching, the typed positional event, a parameter decorator, a
 * keyboard, and string/command returns.
 */
@Router()
export class GreetRouter {
  @Command('start')
  start(message: Message, @Sender() user: User) {
    const keyboard = new InlineKeyboard()
      .text('Ping me', 'ping')
      .url('Docs', 'https://nestgram.com');

    return message.answer(`Hello, ${user.first_name}!`, {
      reply_markup: keyboard,
    });
  }

  @Action('ping')
  pong(query: CallbackQuery) {
    return query.answer('pong');
  }

  // Start the feedback wizard — its @OnEnter shows the first prompt, and each
  // @Step() drives the conversation forward (see feedback.scene.ts).
  @Command('feedback')
  feedback(message: Message, @SceneCtx() scene: SceneContext) {
    return scene.enter(FeedbackScene);
  }

  @Hears('ping')
  hearsPing() {
    return 'pong';
  }

  // @NoScene() keeps the catch-all from stealing a scene step's input while the
  // feedback wizard is running (the scene counterpart of @NoState()).
  @OnMessage()
  @NoScene()
  echo(message: Message) {
    return message.text;
  }
}
