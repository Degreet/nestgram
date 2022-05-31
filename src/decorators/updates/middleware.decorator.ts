import { DecoratorMethod, MiddlewareFunction } from '../../types';

/**
 * Applying middleware
 * */
export function Middleware(middleware: MiddlewareFunction): DecoratorMethod {
  return function (target: any, key: string, descriptor: PropertyDescriptor): any {
    const middlewares: MiddlewareFunction[] = [
      ...(Reflect.getMetadata('middlewares', descriptor.value) || []),
      middleware,
    ];

    Reflect.defineMetadata('middlewares', middlewares, descriptor.value);
    return descriptor;
  };
}
