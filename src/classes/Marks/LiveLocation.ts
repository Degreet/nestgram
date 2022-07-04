import { MarkCreator } from './MarkCreator';
import { Keyboard } from '../Keyboard/Keyboard';
import { IEditLiveLocationOptions } from '../../types';

export class LiveLocation extends MarkCreator {
  /**
   * New live location wrapper
   * @param latitude Location latitude
   * @param longitude Location longitude
   * @param keyboard Optional. Keyboard you want to add
   * @param moreOptions Optional. More options. {@link IEditLiveLocationOptions}
   * */
  constructor(
    public readonly latitude: number,
    public readonly longitude: number,
    public readonly keyboard?: Keyboard,
    public readonly moreOptions: IEditLiveLocationOptions = {},
  ) {
    super();
  }
}
