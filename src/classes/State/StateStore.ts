import { IStateInfo } from '../../types/state.types';

export class StateStore<T = any> {
  protected states: IStateInfo<T>[] = [];

  getStore(userId: number): T {
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
