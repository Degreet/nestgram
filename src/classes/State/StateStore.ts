import { IStateInfo } from '../../types/state.types';

export class StateStore<T = any> {
  protected states: IStateInfo<T>[] = [];

  /**
   * If you set a custom getter, when the user wants to get the store, he will ask your method. Must return object (state)
   * */
  customGet: (userId: number) => T | any;

  getStore(userId: number): T {
    if (this.customGet) return this.customGet(userId);

    let state: IStateInfo<T> | undefined = this.states.find(
      (stateInfo: IStateInfo<T>): boolean => stateInfo.userId === userId,
    );

    if (!state) {
      state = { userId, state: {} as T };
      this.states.push(state);
    }

    return state.state;
  }
}

export const stateStore: StateStore = new StateStore();
