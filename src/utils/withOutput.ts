import LISA, { TaskObject } from '@listenai/lisa_core';
import { Options, ExecaChildProcess } from 'execa';
import { createInterface } from 'readline';
import { PassThrough } from 'stream';

type CmdFunc = typeof LISA.cmd;
type TaskArguments = Parameters<TaskObject['task']>;

export default function withOutput(cmd: CmdFunc, task: TaskArguments[1]):
  (file: string, args?: string[], opts?: Options<string>) => ExecaChildProcess<string> {
  return (file, args?, opts?) => {
    const exec = cmd(file, args, opts);

    const muxer = new PassThrough();
    exec.stdout?.pipe(muxer);
    exec.stderr?.pipe(muxer);

    const rl = createInterface({ input: muxer, crlfDelay: Infinity });
    rl.on('line', (line) => {
      task.output = line;
    });

    return exec;
  };
}
