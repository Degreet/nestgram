import { RoutePredicate } from '../engine/matching';

export interface ListenerOptions {
  updateType: string;
  predicates?: RoutePredicate[];
}
