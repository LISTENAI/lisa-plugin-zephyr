import LISA from '@listenai/lisa_core'
import { mkdirs } from 'fs-extra';
import { dirname } from 'path';
import { makeEnv } from '../env';

/**
 * LTFS打包
 * @param dir 资源存放路径
 * @param targetPath 存放的目标文件
 * @param regSize 内存大小
 */
export async function LTFSBuild(dir: string, targetPath: string, regSize: number) {
  await mkdirs(dirname(targetPath));
  await LISA.cmd('mklfs', ['.', targetPath, String(regSize)], {
    env: await makeEnv(),
    cwd: dir,
  });
}
