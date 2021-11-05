import LISA from '@listenai/lisa_core'
import * as path from 'path'
import { ParsedArgs } from 'minimist'
import * as YAML from 'js-yaml'
import { workspace } from '../utils/ux'
import { LTFSBuild } from '../utils/fsbuild'

const RESOURCE_DIR = 'resource'
const FS_CONFIG_PATH = path.join(RESOURCE_DIR, 'fs.yaml')
const DEFAULT_FS_SYSTEM = 'LFSE'

// mock一个dts的json结构
const MOCK_DTS: {
  [key: string]: any
} = {
  flash0: {
    reg: [0x3fc7c000, 0x50000],
    label: 'storage',
  },
  flash1: {
    reg: [0x60004000, 0x50000],
    label: 'storage1',
  },
}

function loadYaml(fsymlPath: string) {
  const {fs, application} = LISA
  let fsyml: {
    [key: string]: any
  }
  try {
    fsyml = YAML.load(fs.readFileSync(fsymlPath).toString()) as {
      [key: string]: any
    }
  } catch (e) {
    application.debug(e)
    fsyml = {}
  }
  return fsyml
}

export default ({ job, application, cmd, fs }: typeof LISA) => {

  job('fs:init', {
    title: '资源结构初始化',
    async task(ctx, task) {
      // 解析dts
      // ...

      // 确定项目目录
      const projectRoot = workspace()
      fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR)))

      // YAML解析
      const fsymlPath = path.resolve(path.join(projectRoot, FS_CONFIG_PATH))
      let fsyml = loadYaml(fsymlPath)

      // 创建文件夹结构
      Object.keys(MOCK_DTS).forEach(key => {
        const labelName = MOCK_DTS[key]?.label
        application.debug('mkdirp->', path.resolve(path.join(projectRoot, RESOURCE_DIR, labelName)))
        fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR, labelName)))
        fsyml[labelName] = fsyml[labelName] || DEFAULT_FS_SYSTEM
      })

      // 写入fs.yaml
      fs.writeFileSync(fsymlPath, YAML.dump(fsyml))
    }
  });

  job('fs:build', {
    title: '打包资源镜像',
    async task(ctx, task) {
      // 确定项目目录
      const projectRoot = workspace()
      const fsymlPath = path.resolve(path.join(projectRoot, FS_CONFIG_PATH))
      // 判断是否存在fsyml配置文件
      if (!fs.existsSync(fsymlPath)) {
        throw new Error(`当前无需要打包的资源配置，可先执行lisa zep fs:init进行初始化`);
      }
      // 解析fsyml配置文件
      let fsyml = loadYaml(fsymlPath)
      application.debug(fsyml)

      const res = await Promise.all(
        Object.keys(fsyml).map(item => {
          // 确保存在该资源文件夹
          fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR, item)))
          return LTFSBuild(
            path.resolve(path.join(projectRoot, RESOURCE_DIR, item)),
            path.resolve(path.join(projectRoot, 'build', 'resource', `${item}.bin`)),
            4096
          )
        })
      )
      application.debug(res)
    },
  });

  job('fs:flash', {
    title: '烧录资源镜像',
    async task(ctx, task) {

    },
  });

  job('fs:clean', {
    title: '清理资源镜像',
    async task(ctx, task) {
      
    },
  });

}
