import LISA from '@listenai/lisa_core'
import { loadBundle, makeEnv } from '../env';

/**
 * LTFS打包
 * @param dir 资源存放路径
 * @param targetPath 存放的目标文件
 * @param regSize 内存大小
 */
export async function LTFSBuild(dir: string, targetPath: string, regSize: number) {
  // test
  try {
    await LISA.cmd('mklfs', [ dir, targetPath, String(regSize)], {
      env: await makeEnv(),
    });  
  } catch (error) {
    LISA.application.debug(error)
    throw new Error('打包失败')    
  }
}

