import { RoutePredicate } from '../matching';

export interface ListenerOptions {
  updateType: string;
  predicates?: RoutePredicate[];
}
