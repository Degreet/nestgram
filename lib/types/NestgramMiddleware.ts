export interface NestgramMiddleware {
  updateTypes?: string[];

  use(...args: any[]): any | Promise<any>;
}

export interface FilteredNestgramMiddleware {
  instance: NestgramMiddleware;
  name: string;
}
