import LISA, { TaskObject } from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';
import { resolve } from 'path';
import {ISampleList} from './fs';

export function workspace(): string | undefined {
  const { application } = LISA;
  const argv = application.argv as ParsedArgs;
  return argv._[1] ? resolve(argv._[1]) : undefined;
}

type TaskArguments = Parameters<TaskObject['task']>;

export async function promptDir(selected: Array<string>, dirJson: ISampleList, task: TaskArguments[1]): Promise<Array<string>> {
  const choices = Object.keys(dirJson).map(dir => {
    return typeof dirJson[dir] !== 'string' ? `${dir}/` : dir;
  });
  const value = await task.prompt<string>([
    {
      type: 'Select',
      name: 'value',
      message: 'Please select dir',
      choices: choices,
      result: (value) => value.replace('/', '')
    }
  ])
  selected.push(value);
  if (typeof dirJson[value] === 'string') {
    return selected
  }
  return await promptDir(selected, dirJson[value] as ISampleList, task);
}
