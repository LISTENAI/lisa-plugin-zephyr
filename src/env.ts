import { join } from 'path';

export const PLUGIN_HOME = join(__dirname, '..');

export const VENV_HOME = join(PLUGIN_HOME, 'venv');
export const VENV_BIN = join(VENV_HOME, 'bin');

interface IEnv {
  path(): Promise<Record<string, string>>;
  version(): Promise<Record<string, string>>;
  env(): Promise<Record<string, string>>;
}

export async function loadEnv(name: string): Promise<IEnv | null> {
  try {
    return await import(`@tool/${name}-env`);
  } catch (e) {
    return null;
  }
}

export function env() {
  return {
    PLUGIN_HOME,
    VENV_HOME,
    VENV_BIN
  }
}
