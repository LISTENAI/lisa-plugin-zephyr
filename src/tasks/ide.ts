import { LisaType, job } from '../utils/lisa_ex';
import { join } from 'path';
import { getBinarie, getEnv } from '../env';
import { venvScripts } from "../venv";
import { Binary } from '@binary/type';
import {
    copy, writeFile, readJson, pathExists
} from 'fs-extra';
import { homedir, platform } from 'os';


export default ({ application, cli }: LisaType) => {
    job('ide', {
        title: '生成vscode 配置文件',
        async task(ctx, task) {

            const ToolchainPrefixType: any = {
                zephyr: "arm-zephyr-eabi",
                gnuarmemb: "arm-none-eabi",
            };
            const os = platform();
            const HOMEDIR = homedir();
            const LISA_HOME = process.env.LISA_HOME || '';
            const env = await getEnv();
            // const ZEPHYR_TOOLCHAIN_VARIANT = env["ZEPHYR_TOOLCHAIN_VARIANT"] || 'gnuarmemb';
            const ZEPHYR_TOOLCHAIN_VARIANT = 'zephyr';
            const toolchainPrefix = ToolchainPrefixType[ZEPHYR_TOOLCHAIN_VARIANT];
            const jlink = await getBinarie('jlink-venus');
            let armTool: Binary | undefined;
            let serverpath = "";
            let armToolchainPath = "";
            let pyocdpath = await venvScripts('pyocd');
            switch (ZEPHYR_TOOLCHAIN_VARIANT) {
                // case 'gnuarmemb':
                //     armTool = await getBinarie('gcc-arm-none-eabi-9');
                //     break;
                case 'zephyr':
                    armTool = await getBinarie('zephyr-sdk-0.14.2');
                    break;
                default:
                    break;
            }
            console.debug('armTool----------');
            console.debug(armTool);
            const JLINK_LISA_HOME_INDEX = jlink && jlink.binaryDir && jlink.binaryDir.indexOf(LISA_HOME);
            const JLINK_HOMEDIR_INDEX = jlink && jlink.binaryDir && jlink.binaryDir.indexOf(HOMEDIR);
            const ARM_LISA_HOME_INDEX = armTool && armTool.binaryDir && armTool.binaryDir.indexOf(LISA_HOME);
            const ARM_HOMEDIR_INDEX = armTool && armTool.binaryDir && armTool.binaryDir.indexOf(HOMEDIR);
            const PYOCD_HOMEDIR_INDEX = HOMEDIR && pyocdpath && pyocdpath.indexOf(HOMEDIR);
            const PYOCD_LISA_HOME_INDEX = LISA_HOME && pyocdpath && pyocdpath.indexOf(LISA_HOME);
            if (JLINK_HOMEDIR_INDEX === 0) {
                serverpath = jlink?.binaryDir.replace(HOMEDIR, '${userHome}') || '';
            }
            if (JLINK_LISA_HOME_INDEX === 0) {
                serverpath = jlink?.binaryDir.replace(LISA_HOME, '${env:LISA_HOME}') || '';
            }
            if (ARM_HOMEDIR_INDEX === 0) {
                armToolchainPath = armTool?.binaryDir.replace(HOMEDIR, '${userHome}') || '';
            }
            if (ARM_LISA_HOME_INDEX === 0) {
                armToolchainPath = armTool?.binaryDir.replace(LISA_HOME, '${env:LISA_HOME}') || '';
            }
            if (PYOCD_HOMEDIR_INDEX === 0) {
                pyocdpath = pyocdpath.replace(HOMEDIR, '${userHome}');
            }
            if (PYOCD_LISA_HOME_INDEX === 0) {
                pyocdpath = pyocdpath.replace(LISA_HOME || '', '${env:LISA_HOME}');
            }

            if (os === 'win32') {
                serverpath = join(serverpath, 'JLinkGDBServerCL.exe');
            } else {
                serverpath = join(serverpath, 'JLinkGDBServer');
            }
            //linux下gdbPath 配置
            const gdbPath = join(armToolchainPath, `${ToolchainPrefixType.zephyr}-gdb-no-py`);
            application.debug(LISA_HOME);
            application.debug(HOMEDIR);
            application.debug(gdbPath);
            application.debug(serverpath);
            application.debug(armToolchainPath);
            application.debug(pyocdpath);
            const targetDir = join(process.cwd(), '.vscode');
            const formDir = join(__dirname, '..', '..', 'vscode', 'csk6');
            const Launchfile = join(targetDir, 'launch.json');
            const newLaunchfile = join(formDir, 'launch.json');
            cli.action.start('正在为您生成vscode 配置文件');
            //原来那份
            let launchJson: any = {};
            try {
                if (await pathExists(Launchfile)) {
                    launchJson = await readJson(Launchfile);
                }
            } catch (error) {
            }
            const NewlaunchJson = await readJson(newLaunchfile);
            await copy(formDir, targetDir);
            const configurations = launchJson.configurations || [];
            launchJson.configurations = configurations.concat(NewlaunchJson.configurations);
            launchJson.configurations.map((config: {
                armToolchainPath: string; name: any; serverpath: string; toolchainPrefix: string; gdbPath: string;
            }) => {
                switch (config.name) {
                    case 'LISA DAPlink Launch':
                        config.serverpath = pyocdpath;
                        config.armToolchainPath = armToolchainPath;
                        config.toolchainPrefix = toolchainPrefix;
                        if (os === 'linux' && ZEPHYR_TOOLCHAIN_VARIANT === 'zephyr') {
                            config.gdbPath = gdbPath;
                        }
                        break;
                    case 'LISA Jlink Launch':
                        config.serverpath = serverpath;
                        config.armToolchainPath = armToolchainPath;
                        config.toolchainPrefix = toolchainPrefix;
                        if (os === 'linux' && ZEPHYR_TOOLCHAIN_VARIANT === 'zephyr') {
                            config.gdbPath = gdbPath;
                        }
                        break;
                }
                return config;
            });
            await writeFile(Launchfile, JSON.stringify(launchJson, null, "\t"));

            cli.action.stop('vscode 配置文件生成完毕');
        },

    });
};
