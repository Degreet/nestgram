import { runAmbient, setAmbient } from '../ambient';
import { TelegramExecutionContext } from '../engine/context';
import { FSM } from './fsm.constants';
import { stateGroup } from './state';
import { anyState, noState } from './state-filter.predicates';

const Reg = stateGroup('reg', ['name', 'age']);
const ctx = {} as TelegramExecutionContext; // predicates read ambient, not ctx

function withState(state: string | null, fn: () => void): void {
  runAmbient(() => {
    setAmbient(FSM, { state, data: {} });
    fn();
  });
}

describe('stateGroup / FsmState', () => {
  it('builds dotted state ids from the group and member names', () => {
    expect(Reg.name.id).toBe('reg:name');
    expect(Reg.age.id).toBe('reg:age');
  });

  it('matches only while its own state is active', () => {
    withState('reg:name', () => {
      expect(Reg.name.matches()).toBe(true);
      expect(Reg.age.matches()).toBe(false);
    });
  });

  it('matches nothing when idle or outside an ambient context', () => {
    withState(null, () => expect(Reg.name.matches()).toBe(false));
    expect(Reg.name.matches()).toBe(false);
  });
});

describe('anyState / noState', () => {
  it('anyState matches iff a flow is active', () => {
    withState('reg:name', () => expect(anyState.matches(ctx)).toBe(true));
    withState(null, () => expect(anyState.matches(ctx)).toBe(false));
  });

  it('noState matches iff idle', () => {
    withState(null, () => expect(noState.matches(ctx)).toBe(true));
    withState('reg:name', () => expect(noState.matches(ctx)).toBe(false));
  });
});
