import { pathExists } from 'fs-extra';
import Lisa from '@listenai/lisa_core';

import { resolve, join } from "path";
import { getEnv, invalidateEnv } from "../env";
import { set } from "../env/config";
import { readFileSync } from 'fs';

export default class SDK {

    constructor() {
        
    }

    static async clear() {
        await set("sdk", undefined);
        await invalidateEnv();
    }

    async sdkTag(path: string): Promise<string | null> {
      try {
        const res = await Lisa.cmd('git', ['describe', '--abbrev=0', '--tags'], {
          cwd: path
        });
        return res.stdout || '';
      } catch (error) {
        return ''
      }
    }

    async zephyrbase() {
        const env = await getEnv();
        return env["ZEPHYR_BASE"] ?? '';
    }

    async cskbase() {
      const env = await getEnv();
      return env["CSK_BASE"] ?? '';
    }

    async westConfigPath() {
        const zephyrbase = await this.zephyrbase();
        return zephyrbase ? resolve(zephyrbase, "../.west/config") : '';
    }

    async manifestPath(basicPath: string) {
        const { stdout } = await Lisa.cmd(
            "python",
            ["-m", "west", "config", "manifest.path"],
            {
              env: await getEnv(),
              cwd: basicPath,
            }
        );
        return join(basicPath, stdout);
    }

    private async _checkZephyrBase(zephyrbase: string, westConfigPath: string) {
        if (!zephyrbase) {
          throw new Error(`需要设置 SDK (lisa zep use-sdk [path])`);
        }
        if (!(await pathExists(westConfigPath))) {
          throw new Error(
            `当前 SDK 未初始化，需要设置 SDK (lisa zep use-sdk [directory] [--from-git URL#TAG] [--manifest PATH])`
          );
        }
    }

    async changeVersion(version: string, install: boolean = false) {
        const zephyrbase = await this.cskbase();
        const tag = await this.sdkTag(zephyrbase);
        await this._checkZephyrBase(zephyrbase, await this.westConfigPath());
        const {cmd} = Lisa;
        const env = await getEnv();
        try {
          await cmd("git", ["tag", "-d", tag || ''], {
            env,
            cwd: zephyrbase,
          });
        } catch (error) {
          
        }
        try {
          await cmd("git", ["fetch", "origin", "tag", version, "--no-tags"], {
            stdio: "inherit",
            env,
            cwd: zephyrbase,
          });
          await cmd("git", ["checkout", version], {
            stdio: "inherit",
            env,
            cwd: zephyrbase,
          });
          await cmd("git", ["pull", "origin", version], {
            stdio: "inherit",
            env,
            cwd: zephyrbase,
          });
          await cmd("python", ["-m", "west", "update"], {
            stdio: "inherit",
            env,
            cwd: zephyrbase,
          });
          if (install) {
            await this.installRequirement(zephyrbase)
          }
        } catch (e: any) {
          const { stderr } = e;
          throw new Error(
            (stderr && JSON.stringify(stderr)) || JSON.stringify(e)
          );
        }
    }
    
    async installRequirement(zephyrbase: string) {
        const {cmd} = Lisa;
        await cmd("python", [
            "-m",
            "pip",
            "install",
            "-r",
            join(zephyrbase, "scripts", "requirements.txt"),
        ],
        { 
            stdio: "inherit",
            env: await getEnv(),
        }
        );
    }
} 