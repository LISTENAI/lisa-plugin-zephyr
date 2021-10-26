import { join } from 'path';

export const PLUGIN_HOME = join(__dirname, '..');

export const VENV_HOME = join(PLUGIN_HOME, 'venv');
export const VENV_BIN = join(VENV_HOME, 'bin');

export function env() {
  return {
    PLUGIN_HOME,
    VENV_HOME,
    VENV_BIN
  }
}
