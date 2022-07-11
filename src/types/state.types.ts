export type CustomGetter = (userId: number, params?: any, defaultValue?: any) => Promise<any> | any;

export type CustomSetter = (
  userId: number,
  key: string,
  value: any,
  params?: any,
) => Promise<any> | any;

export interface IStateInfo<T> {
  userId: number;
  state: T;
}
