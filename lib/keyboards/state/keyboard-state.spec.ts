import { getAmbient, runAmbient, setAmbient } from '../../ambient';
import type { TelegramExecutionContext } from '../../engine/context';
import { MemoryStore } from '../../store/key-value-store';
import { KEYBOARD_STATE } from './keyboard-state.constants';
import { keyboardStateKey } from './keyboard-state-key';
import { KeyboardStateService } from './keyboard-state.service';

const callbackCtx = (msg = 100, chat = 5): TelegramExecutionContext =>
  ({
    update: {
      callback_query: { message: { message_id: msg, chat: { id: chat } } },
    },
    bot: { name: 'default' },
  } as unknown as TelegramExecutionContext);

const messageCtx = (): TelegramExecutionContext =>
  ({
    update: { message: { message_id: 1, chat: { id: 5 } } },
    bot: { name: 'default' },
  } as unknown as TelegramExecutionContext);

describe('keyboardStateKey', () => {
  it('scopes a callback to bot · chat · message', () => {
    expect(keyboardStateKey(callbackCtx(100, 5))).toBe('kbd:ndefault:c5:m100');
  });

  it('omits the bot segment when there is no bot name', () => {
    const ctx = {
      update: {
        callback_query: { message: { message_id: 100, chat: { id: 5 } } },
      },
      bot: undefined,
    } as unknown as TelegramExecutionContext;
    expect(keyboardStateKey(ctx)).toBe('kbd:c5:m100');
  });

  it('is undefined for anything but a callback over a message', () => {
    expect(keyboardStateKey(messageCtx())).toBeUndefined();
  });
});

describe('KeyboardStateService', () => {
  it('loads onto the ambient rail and saves the mutated state back', async () => {
    const store = new MemoryStore();
    const service = new KeyboardStateService({ keyboardState: { store } });

    await runAmbient(async () => {
      await service.load(callbackCtx(100, 5));
      // save() re-reads the rail, so a reassigned state object persists too.
      setAmbient(KEYBOARD_STATE, { 'checkbox:x': ['1'] });
      await service.save();
    });

    expect(store.get('kbd:ndefault:c5:m100')).toEqual({ 'checkbox:x': ['1'] });
  });

  it('prefers the explicit store over the session store', async () => {
    const explicit = new MemoryStore();
    const session = new MemoryStore();
    const service = new KeyboardStateService(
      { keyboardState: { store: explicit } },
      { store: session },
    );

    await runAmbient(async () => {
      await service.load(callbackCtx(100, 5));
      setAmbient(KEYBOARD_STATE, { k: 1 });
      await service.save();
    });

    expect(explicit.get('kbd:ndefault:c5:m100')).toEqual({ k: 1 });
    expect(session.get('kbd:ndefault:c5:m100')).toBeUndefined();
  });

  it('falls back to the session store when no explicit store is set', async () => {
    const session = new MemoryStore();
    const service = new KeyboardStateService(undefined, { store: session });

    await runAmbient(async () => {
      await service.load(callbackCtx(100, 5));
      setAmbient(KEYBOARD_STATE, { k: 1 });
      await service.save();
    });

    expect(session.get('kbd:ndefault:c5:m100')).toEqual({ k: 1 });
  });

  it('no-ops for a non-callback update (no key, nothing loaded)', async () => {
    const service = new KeyboardStateService();

    await runAmbient(async () => {
      await service.load(messageCtx());
      expect(getAmbient(KEYBOARD_STATE)).toBeUndefined();
      await service.save(); // no binding → silent no-op
    });
  });
});
