import { delimiter } from 'path';

function findPathKey(): string {
  for (const key in process.env) {
    if (key.toLowerCase() == 'path') {
      return key;
    }
  }
  return 'PATH';
}

export const KEY_OF_PATH = findPathKey();

export const SYSTEM_PATHS = splitPath(process.env[KEY_OF_PATH]);

export function makePath(paths: string[]): Record<string, string> {
  return { [KEY_OF_PATH]: paths.join(delimiter) };
}

export function splitPath(path?: string): string[] {
  if (typeof path == 'string') {
    return path.split(delimiter);
  } else {
    return [];
  }
}
