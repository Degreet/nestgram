import { Provider, Type } from '@nestjs/common';
import { AppliedRouterOptions, RouterOptions } from '../decorators';
import { Metadata } from '../enums';

export function routerFactory(router: Type, parent?: Type) {
  const metadata: RouterOptions = Reflect.getMetadata(Metadata.ROUTER, router);
  if (parent) {
    const newMetadata: AppliedRouterOptions = { ...metadata, parent };
    Reflect.defineMetadata(Metadata.ROUTER, newMetadata, router);
    return newMetadata;
  }
  return metadata;
}

export function createDependentProvider(useClass: Type): Provider<Type> {
  return {
    provide: useClass,
    useClass,
  };
}

export function createRouterProviders(routers: Type[], parent?: Type) {
  const providers: Provider<Type>[] = [];

  routers.forEach((router) => {
    const metadata = routerFactory(router, parent);
    providers.push(createDependentProvider(router));

    if (metadata?.middlewares) {
      providers.push(...metadata.middlewares.map(createDependentProvider));
    }
    if (metadata?.includes) {
      providers.push(...createRouterProviders(metadata.includes, router));
    }
  });

  return providers;
}
