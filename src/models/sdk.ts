import { pathExists, mkdirp, writeFile } from 'fs-extra';
import { undertake } from "../main";
import Lisa from '@listenai/lisa_core';
import { venvScripts } from '../venv';

import { resolve, join } from "path";
import { PACKAGE_HOME, loadBundles, getEnv, invalidateEnv } from "../env";
import { get, set } from "../env/config";

export default class SDK {

    constructor() {
        
    }

    static async clear() {
        await set("sdk", undefined);
        await invalidateEnv();
    }

    async zephyrbase() {
        const env = await getEnv();
        return env["ZEPHYR_BASE"] ?? '';
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
        const zephyrbase = await this.zephyrbase();
        await this._checkZephyrBase(zephyrbase, await this.westConfigPath());
        const {cmd} = Lisa;
        const env = await getEnv();
        try {
          await cmd("git", ["fetch", "origin"], {
            env,
            cwd: zephyrbase,
          });
          await cmd("git", ["checkout", version], {
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