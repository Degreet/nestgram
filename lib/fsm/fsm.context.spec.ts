import { runAmbient, setAmbient } from '../ambient';
import { MemoryStore } from '../store';
import { fsm } from './fsm.context';
import { FSM, FSM_BINDING } from './fsm.constants';
import { stateGroup } from './state';
import type { FsmSnapshot } from './fsm.types';

const Reg = stateGroup('reg', ['name', 'age']);

function inFlow(
  store: MemoryStore,
  key: string,
  snapshot: FsmSnapshot,
  fn: () => Promise<void>,
): Promise<void> {
  return runAmbient(async () => {
    setAmbient(FSM, snapshot);
    setAmbient(FSM_BINDING, { key, store });
    await fn();
  });
}

describe('FsmContext', () => {
  it('reads the current state and data from the ambient snapshot', async () => {
    const store = new MemoryStore();
    await inFlow(
      store,
      'fsm:c1',
      { state: 'reg:name', data: { name: 'A' } },
      async () => {
        expect(fsm().current()).toBe('reg:name');
        expect(fsm().data()).toEqual({ name: 'A' });
      },
    );
  });

  it('set writes the new state through to the store', async () => {
    const store = new MemoryStore();
    await inFlow(store, 'fsm:c1', { state: null, data: {} }, async () => {
      await fsm().set(Reg.age);
      expect(fsm().current()).toBe('reg:age');
      expect(store.get('fsm:c1')).toEqual({ state: 'reg:age', data: {} });
    });
  });

  it('update merges into data and writes through', async () => {
    const store = new MemoryStore();
    await inFlow(store, 'fsm:c1', { state: 'reg:name', data: {} }, async () => {
      await fsm().update({ name: 'A' });
      await fsm().update({ age: 30 });
      expect(store.get('fsm:c1')).toEqual({
        state: 'reg:name',
        data: { name: 'A', age: 30 },
      });
    });
  });

  it('clear deletes the record and resets the ambient snapshot', async () => {
    const store = new MemoryStore();
    store.set('fsm:c1', { state: 'reg:age', data: { name: 'A' } });
    await inFlow(
      store,
      'fsm:c1',
      { state: 'reg:age', data: { name: 'A' } },
      async () => {
        await fsm().clear();
        expect(fsm().current()).toBeNull();
        expect(fsm().data()).toEqual({});
        expect(store.get('fsm:c1')).toBeUndefined();
      },
    );
  });

  it('reads degrade gracefully with no ambient FSM', () => {
    expect(fsm().current()).toBeNull();
    expect(fsm().data()).toEqual({});
  });

  it('a transition throws when FSM is unavailable for the update', async () => {
    await runAmbient(async () => {
      // Ambient is active but no FSM snapshot/binding was seeded (FsmModule not
      // imported, or the update has no chat) — a dropped transition would be a
      // silent trap, so it throws instead.
      await expect(fsm().set(Reg.name)).rejects.toThrow(/FSM is not available/);
    });
  });
});
