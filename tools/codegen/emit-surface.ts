/**
 * Emits the surface snapshot (`surface.generated.ts`): the method/object counts
 * the codegen self-test treats as its baseline. Written by `npm run generate`
 * and guarded by `--check`, so a spec bump that grows or shrinks the surface
 * rewrites the numbers here automatically — the delta shows up in review
 * (`methods: 180 -> 184`) and a forgotten regenerate trips the self-test,
 * instead of a magic number a human has to hand-edit.
 */
import { Ir } from './ir';

const HEADER = `/**
 * GENERATED surface snapshot — written by \`npm run generate\`, guarded by
 * \`--check\`. The committed counts are the codegen self-test baseline; do not
 * hand-edit — run \`npm run generate\` after a spec bump and commit the delta.
 */`;

export function emitSurfaceFile(ir: Ir): string {
  return `${HEADER}
export const GENERATED_SURFACE = {
  methods: ${ir.methods.length},
  objects: ${ir.objects.length},
} as const;
`;
}
