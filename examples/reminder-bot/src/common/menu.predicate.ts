import { RoutePredicate, t, TelegramExecutionContext } from 'nestgram';

export function hearsMenu(key: string): RoutePredicate {
  return {
    matches: (ctx: TelegramExecutionContext): boolean =>
      ctx.update.message?.text === t(key),
  };
}
