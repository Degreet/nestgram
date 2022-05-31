// setup colors in console
import 'colors';

export function log(typeColor: string, ...texts: string[]): void {
  console.log('[NestGram]'[typeColor], ...texts);
}

export function error(...texts: string[]): Error {
  return new Error(
    '[NestGram]'.bgRed + ' ' + texts.map((text: string): string => text.red).join(' '),
  );
}

export function clear(): void {
  console.clear();
}
