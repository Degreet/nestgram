import { CustomGetter, CustomSetter, IStateInfo } from '../../types/state.types';

export class StateStore<T = any> {
  protected states: IStateInfo<T>[] = [];
  private defaultValue: T = {} as T;

  /**
   * If you want to set a custom getter, use .setCustomGetter method
   * */
  private customGetter: CustomGetter;

  /**
   * If you want to set a custom setter, use .setCustomSetter method
   * */
  private customSetter: CustomSetter;

  /**
   * If you set a custom getter, when the user wants to get the store, he will ask your method
   * @param customGetter Custom getter you want to save. Your getter can take user id, params from the handler, and default value as arguments. Getter must return object (state)
   * */
  setCustomGetter(customGetter: CustomGetter): true {
    this.customGetter = customGetter;
    return true;
  }

  /**
   * If you set a custom setter, when the user wants to change the store, he will alert your method
   * @param customSetter Custom setter you want to save. Your setter can take user id, key that will be changed, new value, and params from the handler
   * */
  setCustomSetter(customSetter: CustomSetter): true {
    this.customSetter = customSetter;
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
    let state: T;

    if (this.customGetter) {
      let result: T;

      try {
        result = await this.customGetter(userId, params, this.defaultValue);
      } catch (e: any) {
        result = this.customGetter(userId, params, this.defaultValue);
      }

      state = result;
    } else {
      let stateInfo: IStateInfo<T> | undefined = this.states.find(
        (stateInfo: IStateInfo<T>): boolean => stateInfo.userId === userId,
      );

      if (!stateInfo) {
        stateInfo = { userId, state: (this.defaultValue || {}) as T };
        this.states.push(stateInfo);
      }

      state = stateInfo.state;
    }

    state = new Proxy<any>(state, {
      set: (target: any, name: string, value: any): true => {
        target[name] = value;
        if (this.customSetter) this.customSetter(userId, name, value, params);
        return true;
      },
    });

    return state;
  }
}

export const stateStore: StateStore = new StateStore();
