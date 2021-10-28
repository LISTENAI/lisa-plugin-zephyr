import LISA from '@listenai/lisa_core'
import * as path from 'path'
import { ParsedArgs } from 'minimist'
import * as YAML from 'js-yaml'

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

export default ({ job, application, cmd, fs }: typeof LISA) => {

  job('fs:init', {
    title: '资源结构初始化',
    async task(ctx, task) {
      // 解析dts
      // ...

      // 确定项目目录
      const argv = application.argv as ParsedArgs
      const projectRoot = argv.p ? path.resolve(process.cwd(), argv.p) : process.cwd()
      application.debug('projectRoot->', projectRoot)
      fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR)))

      // YAML解析
      const fsymlPath = path.resolve(path.join(projectRoot, FS_CONFIG_PATH))
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

      // 创建文件夹结构
      Object.keys(MOCK_DTS).forEach(key => {
        const labelName = MOCK_DTS[key]?.label
        application.debug('mkdirp->', path.resolve(path.join(projectRoot, RESOURCE_DIR, labelName)))
        fs.mkdirpSync(path.resolve(path.join(projectRoot, RESOURCE_DIR, labelName)))
        fsyml[key] = fsyml[key] || DEFAULT_FS_SYSTEM
      })

      // 写入fs.yaml
      fs.writeFileSync(fsymlPath, YAML.dump(fsyml))
    }
  });

  job('fs:build', {
    title: '打包资源镜像',
    async task(ctx, task) {

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
