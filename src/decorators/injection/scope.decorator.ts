import { ScopeClass } from '../../types';

/**
 * Creates scope that handle some updates. Scope constructor gets services, passed into module
 * */
export function Scope() {
  return function (_: typeof ScopeClass) {};
}
