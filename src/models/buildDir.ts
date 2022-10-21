import { join } from 'path';
import { pathExists, readFile, mkdirp, writeFile } from 'fs-extra';
import * as yaml from 'js-yaml';

export default class BuildDir {
  workspace: string;
  constructor(workspace: string) {
    this.workspace = workspace || join(process.cwd(), 'build');
  }

  runnerYml = async (): Promise<{ [key: string]: any }> => {
    const file = join(this.workspace, 'zephyr', 'runners.yaml');
    if (!(await pathExists(file))) {
      return {}
    }

    try {
      const runnerContent = (yaml.load((await readFile(file)).toString())) as { [key: string]: any };
      return runnerContent
    } catch (error) {
    }
    return {}
  }



} 