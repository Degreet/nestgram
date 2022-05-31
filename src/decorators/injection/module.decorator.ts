import { IModule, ModuleClass } from '../../types';

/**
 * Creates module: part of bot
 * @param options Set controllers, services, imports for module
 * */
export function Module(options: IModule = {}): Function {
  return function (target: ModuleClass): ModuleClass {
    if (options.controllers) Reflect.defineMetadata('controllers', options.controllers, target);
    if (options.services) Reflect.defineMetadata('services', options.services, target);
    if (options.imports) Reflect.defineMetadata('imports', options.imports, target);
    return target;
  };
}
