import LISA, { TaskObject } from '@listenai/lisa_core';
import { Options, ExecaChildProcess } from 'execa';
import { createInterface } from 'readline';
import { PassThrough } from 'stream';

type CmdFunc = typeof LISA.cmd;
type TaskArguments = Parameters<TaskObject['task']>;

export type Executor = (file: string, args?: string[], opts?: Options<string>) => ExecaChildProcess<string>;

export interface ExecOptions extends Options<string> {
  task?: TaskArguments[1];
}

export default function extendExec(cmd: CmdFunc, extend: ExecOptions = {}): Executor {
  return (file, args?, opts?) => {
    opts = {
      stdio: 'inherit',
      ...extend,
      ...opts,
      env: {
        ...extend.env,
        ...opts?.env,
      },
    };

    LISA.application.debug('exec', { file, args, opts });
    const exec = cmd(file, args, opts);

    const { task } = extend;
    if (task) {
      let title: string | null = null;
      exec.once('spawn', () => {
        title = task.title;
        task.title = '';
      });
      exec.once('close', () => {
        if (title) task.title = title;
      });
    }

    return exec;
  };
}
