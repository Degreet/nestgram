export type CustomGetter = (userId: number, params?: any) => Promise<any> | any;

export interface IStateInfo<T> {
  userId: number;
  state: T;
}
