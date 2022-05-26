import { join } from 'path';
import { pathExists, mkdirp, writeFile } from 'fs-extra';
import { undertake } from "../main";
import { getEnv } from '../env';
import Lisa from '@listenai/lisa_core';
import { venvScripts } from '../venv';

export default class AppProject {
    workspace: string;
    constructor(workspace: string) {
        this.workspace = workspace;
    }

    hasWestManifest = async (): Promise<boolean> => {
        const manifest = join(this.workspace, 'west.yml');
        return await pathExists(manifest);
    }

    topdir = async (): Promise<string | null> => {
        try {
            const res = await Lisa.cmd(await venvScripts('west'), ['topdir'], {
                env: await getEnv(),
            })
            return res.stdout;
        } catch (error) {
        }
        return null;
    }

    selfSDK = async (): Promise<string | null> => {
        try {
            const sdkPath = join(this.workspace, '.sdk');
            if (await pathExists(sdkPath)) {
                const res = await Lisa.cmd(await venvScripts('west'), ['config', 'zephyr.base'], {
                    cwd: sdkPath,
                    env: await getEnv(),
                })
                return join(sdkPath ,res.stdout);
            }
        } catch (error) {}
        return null;
    }

    init = async (): Promise<void> => {
        if (!(await this.hasWestManifest())) {
            return
        }
        await mkdirp(join(this.workspace, '.sdk', '.west'));

        const env = await getEnv();
        delete env['ZEPHYR_BASE'];

        const westConfig = join(this.workspace, '.sdk', '.west', 'config');
        if (!await pathExists(westConfig)) {
            await writeFile(westConfig, `[manifest]\npath = ..\nfile = west.yml`);
        }

        await undertake(['update'], {
            cwd: join(this.workspace, '.sdk'),
            env
        })
    }

} 