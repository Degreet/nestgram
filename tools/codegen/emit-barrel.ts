/**
 * Regenerates lib/api/methods/index.ts: the hand-written ApiMethod base plus a
 * sorted re-export of every generated method file.
 */
import { IrMethod } from './ir';

export function emitMethodsBarrel(methods: IrMethod[]): string {
  const fileNames = methods.map((method) => method.fileName).sort();
  const lines = [
    "export * from './api-method';",
    ...fileNames.map((name) => `export * from './${name}';`),
  ];
  return `${lines.join('\n')}\n`;
}
