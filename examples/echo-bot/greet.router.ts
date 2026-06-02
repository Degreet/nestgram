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
} from 'nestgram';

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

  @Hears('ping')
  hearsPing() {
    return 'pong';
  }

  @OnMessage()
  echo(message: Message) {
    return message.text;
  }
}
