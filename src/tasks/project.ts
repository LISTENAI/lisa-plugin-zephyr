import { LisaType, job } from '../utils/lisa_ex';
import { undertake } from '../main';
import { flashFlags } from '../utils/westConfig';

export default ({ application, cmd, cli }: LisaType) => {

  job('build', {
    title: '构建',
    async task(ctx, task) {
      task.title = '';
      cli.action.start('正在构建')
      const res = await undertake(undefined, true);
      task.title = res ? '构建成功' : '构建失败';
      cli.action.stop()
    },
  });

  job('flash', {
    title: '烧录',
    async task(ctx, task) {
      task.title = '';
      const res = await undertake(await flashFlags());
      task.title = res ? '烧录成功' : '烧录失败';
    },
  });

}
