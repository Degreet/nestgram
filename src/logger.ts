// setup colors in console
import 'colors';

export function log(typeColor: string, ...contents: any[]): void {
  console.log(`[NestGram, ${new Date().toISOString()}]`[typeColor], ...contents);
}

export function info(...contents: any[]): void {
  log('blue', ...contents);
}

export function warn(...contents: any[]): void {
  log('yellow', ...contents);
}

export function success(...contents: any[]): void {
  log('green', ...contents);
}

export function error(...texts: string[]): Error {
  return new Error(
    '[NestGram]'.bgRed + ' ' + texts.map((text: string): string => text.red).join(' '),
  );
}

export function clear(): void {
  console.clear();
}
