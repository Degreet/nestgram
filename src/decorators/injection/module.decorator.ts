import { ModuleClass } from '../../types';

/**
 * Creates module: part of bot
 * @param options Set controllers, services, imports for module {@link ModuleClass}
 * */
export function Module(options: ModuleClass = {}): Function {
  return function (target: ModuleClass): ModuleClass {
    if (options.middlewares) Reflect.defineMetadata('middlewares', options.middlewares, target);
    if (options.controllers) Reflect.defineMetadata('controllers', options.controllers, target);
    if (options.services) Reflect.defineMetadata('services', options.services, target);
    if (options.imports) Reflect.defineMetadata('imports', options.imports, target);
    if (options.modules) Reflect.defineMetadata('modules', options.modules, target);
    return target;
  };
}
