import { join } from 'path';
import { pathExists, mkdirp, move, readdir } from 'fs-extra';
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
            return res.stdout
        } catch (error) {
        }
        return null
    }

    init = async (): Promise<void> => {
        if (!(await this.hasWestManifest())) {
            return
        }
        await mkdirp(join(this.workspace, 'app'));
        const files = await readdir(this.workspace);
        for (let i in files) {
            const target = files[i];
            if (target !== 'app') {
                await move(join(this.workspace, target), join(this.workspace, 'app', target), {
                    overwrite: true
                })
            }
        }

        const env = await getEnv();
        delete env['ZEPHYR_BASE'];

        await undertake(['init', '-l', 'app'], {
            cwd: this.workspace,
            env
        })
        await undertake(['update'], { 
            cwd: this.workspace,
            env
        })
    }

} 