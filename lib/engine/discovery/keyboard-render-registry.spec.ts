import { Logger } from '@nestjs/common';

import { KeyboardRenderRegistry } from './keyboard-render-registry';

describe('KeyboardRenderRegistry', () => {
  it('maps each declared id to its renderer (one method, several groups)', () => {
    const instance = { menu: () => 'KB' };
    const registry = new KeyboardRenderRegistry();
    registry.set([{ ids: ['a', 'b'], instance, methodName: 'menu' }]);

    expect(registry.get('a')?.()).toBe('KB');
    expect(registry.get('b')?.()).toBe('KB');
    expect(registry.get('c')).toBeUndefined();
  });

  it('binds `this`, so the renderer reads fresh instance state each call', () => {
    class Router {
      value = 1;
      menu() {
        return this.value;
      }
    }
    const router = new Router();
    const registry = new KeyboardRenderRegistry();
    registry.set([{ ids: ['x'], instance: router, methodName: 'menu' }]);

    router.value = 42;
    expect(registry.get('x')?.()).toBe(42);
  });

  it('warns and last-one-wins on a duplicate id', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const registry = new KeyboardRenderRegistry();
    registry.set([
      { ids: ['dup'], instance: { menu: () => 'first' }, methodName: 'menu' },
      { ids: ['dup'], instance: { menu: () => 'second' }, methodName: 'menu' },
    ]);

    expect(registry.get('dup')?.()).toBe('second');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('dup'));
    warn.mockRestore();
  });

  it('replaces its contents on each set (boot is idempotent)', () => {
    const registry = new KeyboardRenderRegistry();
    registry.set([
      { ids: ['a'], instance: { menu: () => 1 }, methodName: 'menu' },
    ]);
    registry.set([
      { ids: ['b'], instance: { menu: () => 2 }, methodName: 'menu' },
    ]);

    expect(registry.get('a')).toBeUndefined();
    expect(registry.get('b')?.()).toBe(2);
  });
});
