import { RoutePredicate } from '../../engine/matching';
import { Command } from './command.decorator';

const HELP_COMMAND = 'help';

/**
 * Handle the `/help` command — sugar for `@Command('help')`. Extra predicates
 * narrow further.
 */
export const OnHelp = (...predicates: RoutePredicate[]): MethodDecorator =>
  Command(HELP_COMMAND, ...predicates);
