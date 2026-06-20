import 'reflect-metadata';

import { KeyboardRender } from './keyboard-render.decorator';
import { Metadata } from './metadata.enum';

describe('@KeyboardRender', () => {
  it('records the rendered group ids on the method', () => {
    class Router {
      menu(): void {
        return;
      }
    }
    KeyboardRender('a', 'b')(Router.prototype, 'menu', {
      value: Router.prototype.menu,
    });

    expect(
      Reflect.getMetadata(Metadata.KEYBOARD_RENDER, Router.prototype.menu),
    ).toEqual(['a', 'b']);
  });

  it('throws when no group id is given', () => {
    expect(() => KeyboardRender()).toThrow(/at least one/);
  });
});
