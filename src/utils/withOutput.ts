import LISA from '@listenai/lisa_core';
import { Options, ExecaChildProcess } from 'execa';
import { createInterface } from 'readline';
import { PassThrough } from 'stream';

export default function withOutput(cmd: typeof LISA.cmd, task: { output: string }):
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
