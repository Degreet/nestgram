import { createParamDecorator } from '@nestjs/common';

import { fsm } from '../../fsm/fsm.context';

/**
 * Injects the per-update {@link FsmContext} — the FSM API for routing, reading
 * and transitioning the current state (loaded by `FsmStage` before the handler
 * runs, when `FsmModule` is imported):
 *
 * ```ts
 * @OnMessage(Reg.name)
 * name(message: Message, @Fsm() fsm: FsmContext<RegData>) {
 *   await fsm.update({ name: message.text });
 *   await fsm.set(Reg.age);
 * }
 * ```
 *
 * Type the data via the annotation — `@Fsm() fsm: FsmContext<RegData>` — a param
 * decorator cannot set the parameter's type from its argument. The same context
 * is reachable as the `fsm()` free function in services/guards.
 */
export const Fsm = createParamDecorator((_data: unknown) => fsm());
