import { MarkCreator } from './MarkCreator';

export class Caption extends MarkCreator {
  /**
   * Caption wrapper
   * @param caption Caption you want to edit
   * */
  constructor(public readonly caption: string) {
    super();
  }
}
