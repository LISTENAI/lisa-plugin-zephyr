import { join } from 'path';

const PLUGIN_HOME = join(__dirname, '..');

const VENV_HOME = join(PLUGIN_HOME, 'venv');
const VENV_BIN = join(VENV_HOME, 'bin');

const env = () => {
  return {
    VENV_HOME,
    VENV_BIN
  }
}

export {
  PLUGIN_HOME,
  VENV_HOME,
  VENV_BIN,
  env
}
