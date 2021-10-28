import { join } from 'path';
import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { Binary } from "@binary/type";

import { PLUGIN_HOME } from './env';

const HOME = join(PLUGIN_HOME, 'venv');
const execFile = promisify(_execFile);

export default <Binary>{
  homeDir: HOME,

  binaryDir: join(HOME, 'bin'),

  env: {
    VIRTUAL_ENV: HOME,
  },

  async version() {
    const { stdout } = await execFile(join(this.binaryDir, 'python'), ['--version']);
    return stdout.split('\n')[0].trim();
  }
}
