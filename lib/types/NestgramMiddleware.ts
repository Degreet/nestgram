export interface NestgramMiddleware {
  updateTypes?: string[];

  use(...args: any[]): any | Promise<any>;
}
