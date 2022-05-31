import { ServiceClass } from '../../types';

/**
 * Creates service for isolated code with working db
 * */
export function Service() {
  return function (_: typeof ServiceClass) {};
}
