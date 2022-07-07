export type CustomGetter = (userId: number, params?: any, defaultValue?: any) => Promise<any> | any;

export interface IStateInfo<T> {
  userId: number;
  state: T;
}
