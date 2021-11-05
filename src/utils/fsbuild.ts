import LISA from '@listenai/lisa_core'

/**
 * LTFS打包
 * @param dir 资源存放路径
 * @param targetPath 存放的目标文件
 * @param regSize 内存大小
 */
export async function LTFSBuild(dir: string, targetPath: string, regSize: number) {
  // test
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      LISA.fs.writeFileSync(targetPath, '')
    }, 3000)
  })
}

