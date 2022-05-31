/**
 * Continue search handler. Use @Continue if you want to use other handlers too
 * @param isContinue Continue search handler
 * */
export function Continue(isContinue: boolean = true): MethodDecorator {
  return function (target: any, key: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    Reflect.defineMetadata('continue', isContinue, descriptor.value);
    return descriptor;
  };
}
