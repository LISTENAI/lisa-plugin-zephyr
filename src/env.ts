import { join } from 'path';
import { homedir } from 'os';

const PLUGIN_NAME = 'lisa-plugin-zephyr';
const PLUGIN_API_VER = '1.0';

export const PLUGIN_HOME = join(homedir(), '.listenai', PLUGIN_NAME, PLUGIN_API_VER);

export const VENV_HOME = join(PLUGIN_HOME, 'venv');
export const VENV_BIN = join(VENV_HOME, 'bin');
