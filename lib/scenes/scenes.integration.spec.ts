import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { BotService } from '../api';
import { Command } from '../decorators/listeners/command.decorator';
import { OnText } from '../decorators/listeners/content.decorators';
import { OnMessage } from '../decorators/listeners/on-message.decorator';
import { OnCallbackQuery } from '../decorators/listeners/on-callback-query.decorator';
import { Action } from '../decorators/listeners/action.decorator';
import { Router } from '../decorators/injectable/router.decorator';
import { SceneCtx } from '../decorators/params/scene.decorator';
import { NoScene } from './scene-filter.decorators';
import { CallbackQuery, Message } from '../events';
import { RawUpdate } from '../events/raw-update.types';
import { UpdateDispatcher } from '../engine/dispatcher';
import { NestgramModule } from '../module';
import { MemoryStore } from '../store';
import { OnEnter, OnLeave } from './lifecycle.decorators';
import { Scene } from './scene.decorator';
import { SceneContext } from './scene.context';
import { SceneRegistry } from './scene.registry';
import { ScenesModule } from './scenes.module';
import { Step } from './step.decorator';

interface RegData {
  name: string;
  age: string;
}

const leaveLog: string[] = [];

@Scene('registration')
class RegistrationScene {
  @OnEnter()
  start(): string {
    return 'What is your name?';
  }

  @Step()
  @OnText()
  async name(
    message: Message,
    @SceneCtx() scene: SceneContext<RegData>,
  ): Promise<string | void> {
    await scene.update({ name: message.text });
    return scene.next('How old are you?');
  }

  @Step({ invalid: 'Please send your age as digits.' })
  @OnText()
  async age(
    message: Message,
    @SceneCtx() scene: SceneContext<RegData>,
  ): Promise<string | void> {
    await scene.update({ age: message.text });
    const data = scene.data();
    return scene.leave(`Done, ${data.name} (${data.age})!`);
  }

  @OnLeave()
  cleanup(): void {
    leaveLog.push('registration:leave');
  }
}

@Scene('survey')
class SurveyScene {
  @OnEnter()
  ask(): string {
    return 'Pick an option';
  }

  @Step()
  @OnCallbackQuery()
  async choose(
    query: CallbackQuery,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.leave(`You chose ${query.data}`);
  }

  @OnLeave()
  done(): void {
    leaveLog.push('survey:leave');
  }
}

interface AddressData {
  city: string;
}

/** A sub-dialog pushed from the registration flow to test the scene stack. */
@Scene('address')
class AddressScene {
  @OnEnter()
  ask(): string {
    return 'Which city?';
  }

  @Step()
  @OnText()
  async city(
    message: Message,
    @SceneCtx() scene: SceneContext<AddressData>,
  ): Promise<string | void> {
    return scene.leave(`Saved city ${message.text}`);
  }

  @OnLeave()
  done(): void {
    leaveLog.push('address:leave');
  }
}

/** A parent flow that pushes the address sub-dialog, to test the scene stack. */
@Scene('parent')
class ParentScene {
  @OnEnter()
  start(): string {
    return 'parent:start';
  }

  @Step()
  @OnText()
  async toAddress(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(AddressScene); // push sub-dialog
  }

  @Step()
  @OnText()
  async afterAddress(
    message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    // Runs only once the sub-dialog popped back and advanced the parent.
    return scene.leave(`parent done: ${message.text}`);
  }

  @OnLeave()
  done(): void {
    leaveLog.push('parent:leave');
  }
}

/** A scene that exercises `back`/`goto` navigation over its steps. */
@Scene('navties')
class NavScene {
  readonly seen: string[] = [];

  @OnEnter()
  start(): string {
    return 'nav:start';
  }

  @Step()
  @OnText()
  async one(
    message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    this.seen.push(`one:${message.text}`);
    if (message.text === 'back') {
      return scene.back('back to one');
    }
    if (message.text === 'jump') {
      return scene.goto('three', 'jumped to three');
    }
    return scene.next('to two');
  }

  @Step()
  @OnText()
  async two(
    message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    this.seen.push(`two:${message.text}`);
    return scene.back('back to one');
  }

  @Step()
  @OnText()
  async three(
    message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    this.seen.push(`three:${message.text}`);
    return scene.leave('nav done');
  }
}

/** A callback step with `invalid`, to prove the reprompt mirrors the step kind. */
@Scene('confirm')
class ConfirmScene {
  @OnEnter()
  ask(): string {
    return 'Confirm?';
  }

  @Step({ invalid: 'Tap the Confirm button.' })
  @Action('ok')
  async ok(
    _query: CallbackQuery,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.leave('Confirmed');
  }

  @OnLeave()
  done(): void {
    leaveLog.push('confirm:leave');
  }
}

@Router()
class EntryRouter {
  @Command('confirm')
  confirm(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(ConfirmScene);
  }

  @Command('address')
  address(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(AddressScene);
  }

  @Command('nav')
  nav(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(NavScene);
  }

  @Command('parent')
  parent(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(ParentScene);
  }

  @Command('register')
  register(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(RegistrationScene);
  }

  @Command('survey')
  survey(
    _message: Message,
    @SceneCtx() scene: SceneContext,
  ): Promise<string | void> {
    return scene.enter(SurveyScene);
  }

  // The catch-all, declared LAST so commands win first (first-match-wins);
  // @NoScene() additionally keeps it from stealing a scene step's input.
  @OnMessage()
  @NoScene()
  echo(message: Message): string {
    return `echo:${message.text}`;
  }
}

const store = new MemoryStore();

@Module({
  imports: [
    NestgramModule.forRoot({ token: 'TEST' }),
    ScenesModule.forRoot({ store }),
  ],
  providers: [
    EntryRouter,
    RegistrationScene,
    SurveyScene,
    AddressScene,
    ParentScene,
    NavScene,
    ConfirmScene,
  ],
})
class SceneAppModule {}

function textUpdate(update_id: number, body: string): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'U' },
      text: body,
    },
  };
}

function photoUpdate(update_id: number): RawUpdate {
  return {
    update_id,
    message: {
      message_id: update_id,
      date: 1,
      chat: { id: 1, type: 'private' },
      from: { id: 7, is_bot: false, first_name: 'U' },
      photo: [{ file_id: 'f', file_unique_id: 'u', width: 1, height: 1 }],
    },
  };
}

function callbackUpdate(update_id: number, data: string): RawUpdate {
  return {
    update_id,
    callback_query: {
      id: String(update_id),
      from: { id: 7, is_bot: false, first_name: 'U' },
      chat_instance: 'ci',
      data,
      message: {
        message_id: update_id,
        date: 1,
        chat: { id: 1, type: 'private' },
      },
    },
  };
}

interface TestApp {
  dispatcher: UpdateDispatcher;
  registry: SceneRegistry;
  /** The `text` of every message the bot was asked to send, in order. */
  sent: string[];
  close: () => Promise<void>;
}

/**
 * Boot the app and capture outgoing sends by spying on `BotService.call` — the
 * single chokepoint every reply (and `CallbackQuery.answer`) funnels through.
 * Records the `text` payload so a test reads replies as plain strings.
 */
async function boot(): Promise<TestApp> {
  const app = await NestFactory.createApplicationContext(SceneAppModule, {
    logger: false,
  });
  const bot = app.get(BotService);
  const sent: string[] = [];
  jest
    .spyOn(bot, 'call')
    .mockImplementation(async (method: unknown): Promise<never> => {
      const payload = (method as { payload?: { text?: string } }).payload;
      if (payload?.text !== undefined) {
        sent.push(payload.text);
      }
      return undefined as never;
    });
  return {
    dispatcher: app.get(UpdateDispatcher),
    registry: app.get(SceneRegistry),
    sent,
    close: () => app.close(),
  };
}

describe('Scenes (integration)', () => {
  beforeEach(() => {
    leaveLog.length = 0;
  });

  it('runs an ordered text flow: enter prompt, steps, leave, data wiped', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(1, '/register')); // enter → @OnEnter prompt
    await dispatcher.dispatch(textUpdate(2, 'Alice')); // step 0 → next prompt
    await dispatcher.dispatch(textUpdate(3, '30')); // step 1 → leave

    expect(sent).toEqual([
      'What is your name?',
      'How old are you?',
      'Done, Alice (30)!',
    ]);
    expect(leaveLog).toEqual(['registration:leave']);
    expect(store.get('scenes:c1:u7')).toBeUndefined(); // wiped on leave

    await close();
  });

  it('reprompts on filter-fail when `invalid` is set, then accepts valid input', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(10, '/register'));
    await dispatcher.dispatch(textUpdate(11, 'Bob')); // step 0 accepts text
    await dispatcher.dispatch(photoUpdate(12)); // step 1: non-text → reprompt
    await dispatcher.dispatch(textUpdate(13, '40')); // valid → leave

    expect(sent).toEqual([
      'What is your name?',
      'How old are you?',
      'Please send your age as digits.',
      'Done, Bob (40)!',
    ]);

    await close();
  });

  it('drives a callback-query step (button-driven scene)', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(20, '/survey')); // enter
    await dispatcher.dispatch(callbackUpdate(21, 'opt-b')); // callback step → leave

    expect(sent).toEqual(['Pick an option', 'You chose opt-b']);
    expect(leaveLog).toEqual(['survey:leave']);

    await close();
  });

  it('reprompts a callback-query step on a non-matching callback (kind-correct)', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(80, '/confirm')); // enter
    await dispatcher.dispatch(callbackUpdate(81, 'cancel')); // wrong data → reprompt
    await dispatcher.dispatch(callbackUpdate(82, 'ok')); // right data → leave

    expect(sent).toEqual(['Confirm?', 'Tap the Confirm button.', 'Confirmed']);
    expect(leaveLog).toEqual(['confirm:leave']);

    await close();
  });

  it('runs two scenes independently across one conversation', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(30, '/survey'));
    await dispatcher.dispatch(callbackUpdate(31, 'x')); // leaves survey
    await dispatcher.dispatch(textUpdate(32, '/register')); // fresh scene
    await dispatcher.dispatch(textUpdate(33, 'Carol'));
    await dispatcher.dispatch(textUpdate(34, '50'));

    expect(sent).toEqual([
      'Pick an option',
      'You chose x',
      'What is your name?',
      'How old are you?',
      'Done, Carol (50)!',
    ]);
    expect(leaveLog).toEqual(['survey:leave', 'registration:leave']);

    await close();
  });

  it('pushes a sub-dialog with enter and pops back on leave (scene stack)', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(40, '/parent')); // enter parent
    await dispatcher.dispatch(textUpdate(41, 'go')); // step 0 → push address sub-dialog
    await dispatcher.dispatch(textUpdate(42, 'Kyiv')); // address step → leave, pop to parent
    await dispatcher.dispatch(textUpdate(43, 'resume')); // parent resumes at step 1 → leave

    expect(sent).toEqual([
      'parent:start',
      'Which city?', // sub-dialog @OnEnter
      'Saved city Kyiv', // sub-dialog leave reply
      'parent done: resume', // parent resumed after the sub-dialog
    ]);
    expect(leaveLog).toEqual(['address:leave', 'parent:leave']);
    expect(store.get('scenes:c1:u7')).toBeUndefined(); // fully unwound

    await close();
  });

  it('navigates with next/back/goto over ordered steps', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(50, '/nav')); // enter
    await dispatcher.dispatch(textUpdate(51, 'next')); // step 0 → next → step 1
    await dispatcher.dispatch(textUpdate(52, 'whatever')); // step 1 → back → step 0
    await dispatcher.dispatch(textUpdate(53, 'jump')); // step 0 → goto('three') → step 2
    await dispatcher.dispatch(textUpdate(54, 'final')); // step 2 → leave

    expect(sent).toEqual([
      'nav:start',
      'to two',
      'back to one',
      'jumped to three',
      'nav done',
    ]);

    await close();
  });

  it('@NoScene() catch-all echoes when idle but never steals scene input', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(70, 'hi')); // idle → echo
    await dispatcher.dispatch(textUpdate(71, '/register')); // enter scene
    await dispatcher.dispatch(textUpdate(72, 'Dan')); // scene step, NOT echo
    await dispatcher.dispatch(textUpdate(73, '21')); // scene step → leave
    await dispatcher.dispatch(textUpdate(74, 'bye')); // idle again → echo

    expect(sent).toEqual([
      'echo:hi',
      'What is your name?',
      'How old are you?',
      'Done, Dan (21)!',
      'echo:bye',
    ]);

    await close();
  });

  it('back never goes before the first step (clamped)', async () => {
    const { dispatcher, sent, close } = await boot();

    await dispatcher.dispatch(textUpdate(60, '/nav')); // enter at step 0
    await dispatcher.dispatch(textUpdate(61, 'back')); // step 0 → back stays at step 0
    await dispatcher.dispatch(textUpdate(62, 'next')); // still step 0 → next → step 1

    expect(sent).toEqual(['nav:start', 'back to one', 'to two']);

    await close();
  });

  it('throws on an out-of-range numeric goto ordinal (not silently clamped)', async () => {
    const { registry, close } = await boot();

    // 'navties' has three steps (ordinals 0..2); 99 is out of range.
    expect(() => registry.ordinalOf('navties', 99)).toThrow(
      'Scene "navties" has no step at ordinal 99',
    );
    // Valid ordinals still pass through unchanged.
    expect(registry.ordinalOf('navties', 2)).toBe(2);

    await close();
  });
});
