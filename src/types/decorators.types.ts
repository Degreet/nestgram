export type DecoratorMethod = (
  target: any,
  key: string,
  descriptor: PropertyDescriptor,
) => PropertyDescriptor;

export interface IModule {
  controllers?: ControllerClass[];
  services?: ServiceClass[];
  imports?: any[];
}

export declare class ControllerClass {
  constructor(...services: ServiceClass[]);
}

export declare class ServiceClass {}

export declare class ModuleClass implements IModule {
  controllers?: ControllerClass[];
  services?: ServiceClass[];
  imports?: IModule[];
}
