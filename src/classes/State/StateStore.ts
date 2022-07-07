import { CustomGetter, IStateInfo } from '../../types/state.types';

export class StateStore<T = any> {
  protected states: IStateInfo<T>[] = [];
  private defaultValue: T = {} as T;

  /**
   * If you want to set a custom getter, use .setCustomGetter method
   * */
  private customGetter: CustomGetter;

  /**
   * If you set a custom getter, when the user wants to get the store, he will ask your method
   * @param customGetter Custom getter you want to save. Your getter can take user id, params from the handler, and default value as arguments. Getter must return object (state)
   * */
  setCustomGetter(customGetter: CustomGetter): true {
    this.customGetter = customGetter;
    return true;
  }

  /**
   * Set default value for state
   * @param defaultValue Default value you want to set. Must be an object
   * */
  setDefaultValue(defaultValue: T): true {
    this.defaultValue = defaultValue;
    return true;
  }

  async getStore(userId: number, params?: any): Promise<T> {
    if (this.customGetter) {
      let result: T;

      try {
        result = await this.customGetter(userId, params, this.defaultValue);
      } catch (e: any) {
        result = this.customGetter(userId, params, this.defaultValue);
      }

      return result;
    }

    let state: IStateInfo<T> | undefined = this.states.find(
      (stateInfo: IStateInfo<T>): boolean => stateInfo.userId === userId,
    );

    if (!state) {
      state = { userId, state: (this.defaultValue || {}) as T };
      this.states.push(state);
    }

    return state.state;
  }
}

export const stateStore: StateStore = new StateStore();
