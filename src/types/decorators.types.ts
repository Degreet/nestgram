import { MiddlewareFunction } from './middleware.types';

export type DecoratorMethod = (
  target: any,
  key: string,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor;

export type ModuleFunction = () => Promise<any[] | void> | any[] | void;

export declare class ControllerClass {
  constructor(...services: ServiceClass[]);
}

export declare class ScopeClass extends ControllerClass {}

export declare class ServiceClass {
  constructor(...args: any[]);
}

export declare class ModuleClass {
  middlewares?: MiddlewareFunction[];
  controllers?: ControllerClass[];
  modules?: ModuleFunction[];
  services?: ServiceClass[];
  imports?: any[];
  scopes?: ScopeClass[];
}
