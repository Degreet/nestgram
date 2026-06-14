import {
  Message,
  OnEnter,
  OnLeave,
  OnText,
  Scene,
  SceneContext,
  SceneCtx,
  Step,
} from 'nestgram';

interface FeedbackData {
  topic: string;
  details: string;
}

/**
 * A two-step wizard: ask for a topic, then details, then thank the user. Shows
 * the scene surface — `@OnEnter` prompts on entry, each `@Step()` is gated to its
 * ordinal, `scene.update` accumulates ephemeral data, and `scene.leave` finishes
 * and wipes it. Enter it from a router with `scene.enter(FeedbackScene)`.
 */
@Scene('feedback')
export class FeedbackScene {
  @OnEnter()
  start(): string {
    return 'What is your feedback about? (e.g. "bug", "idea")';
  }

  @Step({ invalid: 'Please describe the topic as text.' })
  @OnText()
  async topic(
    message: Message,
    @SceneCtx() scene: SceneContext<FeedbackData>,
  ): Promise<string | void> {
    await scene.update({ topic: message.text });
    return scene.next('Got it. Now the details?');
  }

  @Step({ invalid: 'Please send the details as text.' })
  @OnText()
  async details(
    message: Message,
    @SceneCtx() scene: SceneContext<FeedbackData>,
  ): Promise<string | void> {
    await scene.update({ details: message.text });
    const { topic } = scene.data();
    return scene.leave(`Thanks! Your "${topic}" feedback was recorded. ✅`);
  }

  @OnLeave()
  cleanup(): void {
    // Scene data is wiped automatically on leave; persist a result or clear a
    // keyboard here. Side effects only — a returned value is ignored.
  }
}
