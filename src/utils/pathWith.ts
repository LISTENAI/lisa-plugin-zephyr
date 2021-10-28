import { delimiter } from 'path';

function findPathKey(): string | undefined {
  for (const key in process.env) {
    if (key.toLowerCase() == 'path') {
      return key;
    }
  }
}

export default function pathWith(prepend: string[]): Record<string, string> {
  const key = findPathKey();
  if (!key) return {};

  const path = [
    ...prepend,
    ...process.env[key]!.split(delimiter),
  ].join(delimiter);

  return { [key]: path };
}
