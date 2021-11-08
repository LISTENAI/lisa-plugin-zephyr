import LISA from '@listenai/lisa_core'
import * as path from 'path'
import * as YAML from 'js-yaml'
import { workspace } from '../utils/ux'
import { LTFSBuild } from '../utils/fsbuild'
import { loadDT } from 'zephyr-dts'

const RESOURCE_DIR = 'resource'
const BUILD_DIR = 'build'
const FS_CONFIG_PATH = path.join(RESOURCE_DIR, 'fs.yaml')
const DEFAULT_FS_SYSTEM = 'LFS'

interface Iflash {
  label: string;
  addr: number;
  size: number;
  fs_system?: string;
}

function loadYaml(fsymlPath: string) {
  const {fs, application} = LISA
  let fsyml: Iflash[]
  try {
    fsyml = YAML.load(fs.readFileSync(fsymlPath).toString()) as []
    fsyml = Array.from(fsyml)
  } catch (e) {
    application.debug(e)
    fsyml = []
  }
  return fsyml
}

export default ({ job, application, cmd, fs }: typeof LISA) => {

  job('fs:init', {
    title: '资源结构初始化',
    async task(ctx, task) {
      // 确定项目目录
      const projectRoot = workspace()

      // 解析dts
      let flashs: Iflash[] = []
      try {
        const dt = await loadDT(path.resolve(path.join(projectRoot, BUILD_DIR)))
        const flash = dt.choose('zephyr,flash')
        if (flash) {
          for (const part of dt.under(`${flash.path}/partitions`)) {
            const reg = part.reg![0]!
            flashs.push({
              label: part.label || '',
              addr: reg.addr || 0,
              size: reg.size || 0
            })
          }
        }
      } catch (error) {
        flashs = []
      }
      if (!flashs.length) {
        throw new Error(`当前项目没有分配flash分区`)
      }
      application.debug(flashs)

      // 初始化目录
      fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR)))

      // YAML解析
      const fsymlPath = path.resolve(path.join(projectRoot, FS_CONFIG_PATH))
      let fsyml = loadYaml(fsymlPath)
      

      // 创建文件夹结构
      flashs.forEach(flash => {
        const labelName = flash.label || ''
        application.debug('mkdirp->', path.resolve(path.join(projectRoot, RESOURCE_DIR, labelName)))
        fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR, labelName)))
        const basicFlash: {[key: string]: any} | Iflash = fsyml.find((item: Iflash) => item.label === labelName) || {}
        flash.fs_system = basicFlash?.fs_system || DEFAULT_FS_SYSTEM
      })

      // 写入fs.yaml
      fs.writeFileSync(fsymlPath, YAML.dump(flashs))
    }
  })

  job('fs:build', {
    title: '打包资源镜像',
    async task(ctx, task) {
      // 确定项目目录
      const projectRoot = workspace()
      const fsymlPath = path.resolve(path.join(projectRoot, FS_CONFIG_PATH))
      // 判断是否存在fsyml配置文件
      if (!fs.existsSync(fsymlPath)) {
        throw new Error(`当前无需要打包的资源配置，可先执行lisa zep fs:init进行初始化`)
      }
      // 解析fsyml配置文件
      let fsyml = loadYaml(fsymlPath)
      application.debug(fsyml)

      const res = await Promise.all(
        fsyml.map((item: Iflash) => {
          // 确保存在该资源文件夹
          fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR, item.label)))
          return LTFSBuild(
            path.resolve(path.join(projectRoot, RESOURCE_DIR, item.label)),
            path.resolve(path.join(projectRoot, 'build', 'resource', `${item.label}.bin`)),
            item.size
          )
        })
      )
      application.debug(res)
    },
  })

  job('fs:flash', {
    title: '烧录资源镜像',
    async task(ctx, task) {

    },
  })

  job('fs:clean', {
    title: '清理资源镜像',
    async task(ctx, task) {
      const projectRoot = workspace()
      await fs.remove(path.resolve(path.join(projectRoot, 'build', 'resource')))
    },
  })

}
