export interface NestgramFilter {
  updateTypes?: string[];

  canActivate(...args: any[]): boolean | Promise<boolean>;
}
