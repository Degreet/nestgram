import { getAmbient, runAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { MemoryStore } from '../store';
import { FsmService } from './fsm.service';
import { FSM, FSM_BINDING } from './fsm.constants';
import type { FsmBinding, FsmSnapshot } from './fsm.types';

function ctx(update: Record<string, unknown>): TelegramExecutionContext {
  return {
    chat: { id: 1 },
    from: { id: 7 },
    update,
  } as unknown as TelegramExecutionContext;
}

describe('FsmService', () => {
  it('is a no-op when FSM is not configured', async () => {
    await runAmbient(async () => {
      await new FsmService().load(ctx({ message: {} }));
      expect(getAmbient(FSM)).toBeUndefined();
    });
  });

  it('seeds a fresh snapshot and a namespaced binding', async () => {
    const manager = new FsmService({ store: new MemoryStore() });
    await runAmbient(async () => {
      await manager.load(ctx({ message: {} }));
      expect(getAmbient<FsmSnapshot>(FSM)).toEqual({ state: null, data: {} });
      expect(getAmbient<FsmBinding>(FSM_BINDING)?.key).toBe('fsm:c1:u7');
    });
  });

  it('loads an existing record from the store under the fsm: namespace', async () => {
    const store = new MemoryStore();
    store.set('fsm:c1:u7', { state: 'reg:age', data: { name: 'A' } });
    const manager = new FsmService({ store });
    await runAmbient(async () => {
      await manager.load(ctx({ message: {} }));
      expect(getAmbient<FsmSnapshot>(FSM)).toEqual({
        state: 'reg:age',
        data: { name: 'A' },
      });
    });
  });

  it('skips when there is no chat to scope to', async () => {
    const manager = new FsmService({ store: new MemoryStore() });
    await runAmbient(async () => {
      await manager.load({
        chat: undefined,
        from: { id: 7 },
        update: {},
      } as unknown as TelegramExecutionContext);
      expect(getAmbient(FSM)).toBeUndefined();
    });
  });
});
