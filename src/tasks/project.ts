import LISA from '@listenai/lisa_core';

export default ({ job, application, Tasks }: typeof LISA) => {

  job('build', {
    title: '构建',
    async task(ctx, task) {
      return new Tasks([
        application.tasks['app:build'],
      ]);
    },
  });

  job('clean', {
    title: '清理',
    async task(ctx, task) {
      return new Tasks([
        application.tasks['app:clean'],
      ]);
    },
  });

}