import { LisaType, job } from '../utils/lisa_ex';
import { join } from 'path';
import { getBinarie } from '../env'
import { venvScripts } from "../venv";

import {
    copy, writeFile, readJson, pathExists
} from 'fs-extra';
import { homedir, platform } from 'os';
export default ({ application, cli }: LisaType) => {
    job('ide', {
        title: '生成vscode 配置文件',
        async task(ctx, task) {
            const os = platform()
            const LISA_HOME = process.env.LISA_HOME || ''
            const HOMEDIR = homedir()
            const jlink = await getBinarie('jlink-venus')
            const armTool = await getBinarie('gcc-arm-none-eabi-9')
            let serverpath = ""
            let armToolchainPath = ""
            let pyocdpath = await venvScripts('pyocd')
            application.debug(LISA_HOME)
            application.debug(HOMEDIR)

            const JLINK_LISA_HOME_INDEX = jlink && jlink.binaryDir && jlink.binaryDir.indexOf(LISA_HOME)
            const JLINK_HOMEDIR_INDEX = jlink && jlink.binaryDir && jlink.binaryDir.indexOf(HOMEDIR)
            const ARM_LISA_HOME_INDEX = armTool && armTool.binaryDir && armTool.binaryDir.indexOf(LISA_HOME)
            const ARM_HOMEDIR_INDEX = armTool && armTool.binaryDir && armTool.binaryDir.indexOf(HOMEDIR)
            const PYOCD_HOMEDIR_INDEX = HOMEDIR && pyocdpath && pyocdpath.indexOf(HOMEDIR)
            const PYOCD_LISA_HOME_INDEX = LISA_HOME && pyocdpath && pyocdpath.indexOf(LISA_HOME)
            if (JLINK_HOMEDIR_INDEX === 0) {
                serverpath = jlink?.binaryDir.replace(HOMEDIR, '${userHome}') || ''
            }
            if (JLINK_LISA_HOME_INDEX === 0) {
                serverpath = jlink?.binaryDir.replace(LISA_HOME, '${env:LISA_HOME}') || ''
            }
            if (ARM_HOMEDIR_INDEX === 0) {
                armToolchainPath = armTool?.binaryDir.replace(HOMEDIR, '${userHome}') || ''
            }
            if (ARM_LISA_HOME_INDEX === 0) {
                armToolchainPath = armTool?.binaryDir.replace(LISA_HOME, '${env:LISA_HOME}') || ''
            }
            if (PYOCD_HOMEDIR_INDEX === 0) {
                pyocdpath = pyocdpath.replace(HOMEDIR, '${userHome}')
            }
            if (PYOCD_LISA_HOME_INDEX === 0) {
                pyocdpath = pyocdpath.replace(LISA_HOME || '', '${env:LISA_HOME}')
            }

            if (os === 'win32') {
                serverpath = join(serverpath, 'JLinkGDBServerCL.exe')
            } else {
                serverpath = join(serverpath, 'JLinkGDBServer')
            }
            application.debug(serverpath)
            application.debug(armToolchainPath)
            application.debug(pyocdpath)
            const targetDir = join(process.cwd(), '.vscode');
            const formDir = join(__dirname, '..', '..', 'vscode', 'csk6');
            const Launchfile = join(targetDir, 'launch.json');
            const newLaunchfile = join(formDir, 'launch.json');
            cli.action.start('正在为您生成vscode 配置文件')
            //原来那份
            let launchJson: any = {};
            try {
                if (await pathExists(Launchfile)) {
                    launchJson = await readJson(Launchfile)
                } 
            } catch (error) {
            }
            const NewlaunchJson = await readJson(newLaunchfile)
            await copy(formDir, targetDir)
            const configurations = launchJson.configurations || []
            launchJson.configurations = configurations.concat(NewlaunchJson.configurations)
            launchJson.configurations.map((config: {
                armToolchainPath: string; name: any; serverpath: string;
            }) => {
                switch (config.name) {
                    case 'LISA DAPlink Launch':
                        config.serverpath = pyocdpath
                        config.armToolchainPath = armToolchainPath
                        break
                    case 'LISA Jlink Launch':
                        config.serverpath = serverpath;
                        config.armToolchainPath = armToolchainPath
                        break
                }
                return config
            })
            await writeFile(Launchfile, JSON.stringify(launchJson, null, "\t"));

            cli.action.stop('vscode 配置文件生成完毕')
        },

    });
}
