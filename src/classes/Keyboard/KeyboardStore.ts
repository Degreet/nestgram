import { IKeyboardLayout } from '../../types';

class KeyboardStore {
  layouts: IKeyboardLayout[] = [];
}

export const keyboardStore: KeyboardStore = new KeyboardStore();
