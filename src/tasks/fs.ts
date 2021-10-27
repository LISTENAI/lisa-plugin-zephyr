import LISA from '@listenai/lisa_core';

export default ({ job, application, cmd }: typeof LISA) => {

  job('fs:init', {
    title: '资源结构初始化',
    async task(ctx, task) {
      application.debug(application.tasks)
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
