import { RoutePredicate } from '../../engine/matching';
import { Command } from './command.decorator';

const START_COMMAND = 'start';

/**
 * Handle the `/start` command — sugar for `@Command('start')`, the entry point
 * almost every bot has. Extra predicates narrow further.
 */
export const OnStart = (...predicates: RoutePredicate[]): MethodDecorator =>
  Command(START_COMMAND, ...predicates);
