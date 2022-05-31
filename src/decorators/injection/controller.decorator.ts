import { ControllerClass } from '../../types';

/**
 * Creates controller that handle some updates. Controller constructor gets services, passed into module
 * */
export function Controller() {
  return function (_: typeof ControllerClass) {};
}
