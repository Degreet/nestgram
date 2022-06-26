// setup colors in console
import 'colors';

function buildTime(): string {
  const date: Date = new Date();

  const day: string = date.getDate().toString().padStart(2, '0');
  const month: string = (date.getMonth() + 1).toString().padStart(2, '0');
  const year: string = date.getFullYear().toString();

  const hours: string = date.getHours().toString().padStart(2, '0');
  const minutes: string = date.getMinutes().toString().padStart(2, '0');
  const seconds: string = date.getSeconds().toString().padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

export function log(typeColor: string, ...contents: any[]): void {
  console.log(`[NestGram, ${buildTime()}]`[typeColor], ...contents);
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
