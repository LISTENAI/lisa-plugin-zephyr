import LISA from '@listenai/lisa_core';

export default ({ job, application }: typeof LISA) => {

  job('build', {
    title: '构建',
    async task(ctx, task) {
      return task.newListr([
        application.tasks['app:build'],
        application.tasks['fs:build'],
      ]);
    },
  });

  job('flash', {
    title: '烧录',
    async task(ctx, task) {
      return task.newListr([
        application.tasks['app:flash'],
        application.tasks['fs:flash'],
      ]);
    },
  });

  job('clean', {
    title: '清理',
    async task(ctx, task) {
      return task.newListr([
        application.tasks['app:clean'],
        application.tasks['fs:clean'],
      ]);
    },
  });

}
