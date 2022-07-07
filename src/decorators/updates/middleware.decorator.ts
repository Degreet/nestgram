import { DecoratorMethod, MiddlewareFunction } from '../../types';

/**
 * Applying middleware
 * */
export function Middleware(middleware: MiddlewareFunction): DecoratorMethod {
  return function (target: any, key: string, descriptor: PropertyDescriptor): any {
    const middlewares: MiddlewareFunction[] = [
      middleware,
      ...(Reflect.getMetadata('middlewares', target[key]) || []),
    ];

    Reflect.defineMetadata('middlewares', middlewares, descriptor.value);
    return descriptor;
  };
}
