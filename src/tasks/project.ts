import { LisaType, job } from '../utils/lisa_ex';
import { undertake } from '../main';
import { ParsedArgs } from 'minimist';
// import westConfig from '../utils/westConfig';

export default ({ application, cmd }: LisaType) => {

  job('build', {
    title: '构建',
    async task(ctx, task) {
      task.title = '';
      const res = await undertake();
      task.title = res ? '构建成功' : '构建失败';
    },
  });

  job('flash', {
    title: '烧录',
    async task(ctx, task) {
      task.title = '';
      const runner = (application.argv as ParsedArgs)?.runner || 'pyocd';
      let argv = process.argv.slice(3);
      if (runner) {
        argv = argv.concat(['--runner', runner]);
      }
      const res = await undertake(argv);
      task.title = res ? '烧录成功' : '烧录失败';
    },
  });

}
