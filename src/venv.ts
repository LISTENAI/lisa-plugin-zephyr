import { join } from 'path';
import { promisify } from 'util';
import { execFile as _execFile } from 'child_process';
import { Binary } from "@binary/type";
import { PLUGIN_HOME } from './env/config';

const execFile = promisify(_execFile);

const HOME = join(PLUGIN_HOME, 'venv');

export default <Binary>{
  homeDir: HOME,

  binaryDir: join(HOME, process.platform == 'win32' ? 'Scripts' : 'bin'),

  env: {
    VIRTUAL_ENV: HOME,
  },

  async version() {
    const { stdout } = await execFile(join(this.binaryDir, 'python'), ['--version']);
    return stdout.split('\n')[0].trim();
  }
}

export async function venvScripts(name: string): Promise<string> {
  return join(join(HOME, process.platform == 'win32' ? 'Scripts' : 'bin'), name)
}
