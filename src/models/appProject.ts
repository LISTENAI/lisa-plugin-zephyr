import { join, resolve } from 'path';
import { pathExists, mkdirp, writeFile, symlink, copy, remove, readFile, lstat, unlink } from 'fs-extra';
import { undertake } from "../main";
import { getEnv } from '../env';
import Lisa, { TaskObject } from '@listenai/lisa_core';
import { venvScripts } from '../venv';
import { PLUGIN_HOME } from '../env/config';
import * as yaml from 'js-yaml';
import { platform } from "os";
import simpleGit from "simple-git";
import { clean } from "../utils/repo";
// import { parse } from 'ini';
type TaskArguments = Parameters<TaskObject['task']>;

export default class AppProject {
    workspace: string;
    task: TaskArguments[1] | null = null;
    cacheDir: string = join(PLUGIN_HOME, 'cache');
    constructor(workspace: string, task?: TaskArguments[1]) {
        this.workspace = workspace;
        if (task) {
            this.task = task;
        }
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

    manifest = async (westConfig?: string): Promise<{ [key: string]: any; } | null> => {
        if (westConfig) {
            try {
                return (yaml.load(await readFile(westConfig, 'utf-8'))) as { [key: string]: any };
            } catch (error) {
            }
        } else {
            try {
                const sdkPath = join(this.workspace, '.sdk');
                if (await pathExists(sdkPath)) {
                    const res = await Lisa.cmd(await venvScripts('west'), ['manifest', '--resolve'], {
                        cwd: sdkPath,
                        env: await getEnv(),
                    })
                    return yaml.load(res.stdout) as { [key: string]: any };
                }
            } catch (error) {
            }
        }
        
        return null;
    }

    init = async (): Promise<void> => {
        if (!(await this.hasWestManifest())) {
            return
        }
        console.log('开始初始化...');
        await mkdirp(join(this.workspace, '.sdk', '.west'));

        const env = await getEnv();

        delete env['ZEPHYR_BASE'];

        const westConfig = join(this.workspace, '.sdk', '.west', 'config');
        if (!await pathExists(westConfig)) {
            await writeFile(westConfig, `[manifest]\npath = ..\nfile = west.yml\n\n[zephyr]\nbase=zephyr`);
        }

        await this.update();

        await Lisa.cmd(
            "python",
            [
              "-m",
              "pip",
              "install",
              "-r",
              join(await this.selfSDK() || "", "scripts", "requirements.txt"),
            ],
            { 
                stdio: "inherit",
                env
            }
        );
    }

    update = async (): Promise<void> => {
        if (platform() !== 'win32') {
            const selfSDK = await this.selfSDK();
            if (selfSDK) {
                await this.updateSelfSDK()
            }
            const manifest = await this.manifest();
            if (selfSDK && manifest) {
                const appSDK = join(selfSDK, '..')
                const projects = manifest.manifest.projects;
                for (let i in projects) {
                    const project: { [key: string]: any } = projects[i];
                    // const targetLink = project.name === 'zephyr' ? join(appSDK, 'zephyr') : (project.path ? join(appSDK, project.path) : '');
                    const targetLink = project.path ? join(appSDK, project.path) : '';
                    if (!targetLink) continue;
                    if (await pathExists(targetLink)) {
                        const isLink = (await lstat(targetLink)).isSymbolicLink();
                        if (isLink) {
                            await unlink(targetLink);
                            await this.symlinkPocject(project, targetLink);
                        }
                    } else {
                        await this.symlinkPocject(project, targetLink);
                    }
                }
            }
            this.setTaskTitle('');
        }
        await undertake(['update'])
    }

    updateSelfSDK = async (): Promise<void> => {
        await mkdirp(this.cacheDir);
        const manifest = await this.manifest(join(this.workspace, 'west.yml'));
        if (!manifest) {
            throw new Error('当前项目无提货单配置');
        }
        const zephyrProject = manifest.manifest.projects.find((project: { [key: string]: any }) => project.name === 'zephyr');
        const project = {
            name: zephyrProject.name,
            url: '',
            revision: zephyrProject.revision,
            path: zephyrProject.path
        }
        const zephyrProjectRemote = manifest.manifest.remotes.find((remote: { [key: string]: any }) => remote.name === zephyrProject.remote)
        project.url = `${zephyrProjectRemote && zephyrProjectRemote['url-base']}/${project.path}`

        const targetLink = join(this.workspace, '.sdk', 'zephyr');
        if (await pathExists(targetLink)) {
            const isLink = (await lstat(targetLink)).isSymbolicLink();
            if (isLink) {
                await unlink(targetLink);
                await this.symlinkPocject(project, targetLink);
            }
        } else {
            await this.symlinkPocject(project, targetLink);
        }
        await undertake(['update', 'zephyr'], {
            stdio: "ignore",
        })
    }

    symlinkPocject = async (project: { [key: string]: any }, targetLink: string): Promise<Boolean> => {
        const cacheDir = resolve(join(this.cacheDir, project.url.replace(/^https?:\/\//,'')));
        const mainCache = join(cacheDir, 'main');
        await mkdirp(cacheDir);
        const targetCache = join(cacheDir, project.revision.replace(/\//g, '_'));

        const env  = await getEnv();

        let link = false;
        await mkdirp(join(targetLink, '..'));
        if (await pathExists(targetCache)) {
            try {
                await symlink(targetCache, targetLink);
                link = true;
            } catch (error) {
                console.log(error)
            }
        }
        if (!link && await pathExists(mainCache)) {
            try {
                const res = await Lisa.cmd('git', ['config', '--get', 'remote.origin.url'], {
                    env,
                    cwd: mainCache
                })
                if (res.stdout === project.url || res.stdout === `${project.url}.git`) {
                    await remove(targetCache);
                    this.setTaskTitle(`=== copying ${project.name} (${project.name})`)
                    await copy(mainCache, targetCache);
                    await symlink(targetCache, targetLink);
                    link = true
                }
            } catch (error) {
                console.log(error)
            }
        }
        if (!link && !await pathExists(mainCache)) {
            try {
                await Lisa.cmd('git', ['clone', `${project.url}.git`, 'main', '--depth', '1',], {
                    env,
                    stdio: 'inherit',
                    cwd: cacheDir
                })
                await remove(targetCache);
                this.setTaskTitle(`=== copying ${project.name} (${project.name})`);
                await copy(mainCache, targetCache);
                await symlink(targetCache, targetLink);
                link = true
            } catch (error) {
                console.log(error)
            }
        }

        if (link) {
            try {
                this.setTaskTitle(`=== cache fetch ${project.name} (${project.name})`);
                await Lisa.cmd('git', ['fetch', `origin`, `${project.revision}`], {
                    env,
                    cwd: targetLink
                })
            } catch (error) {
                console.log(error)
            }
        }
        return link;
    }

    setTaskTitle = (title: string): void => {
        if (this.task) {
            this.task.title = title;
        }
    }

} 