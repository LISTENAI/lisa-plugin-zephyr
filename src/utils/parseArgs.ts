import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';

interface ParseArgField {
  short?: string;
  help?: string;
  arg?: string;
  optArg?: string;
}

export type ParseArgOptions = Record<string, ParseArgField>;
type ParseArgResult<T> = { [K in keyof T]?: string };

export function parseArgs<T = ParseArgOptions>(argv: string[] | ParsedArgs, options: T): ParseArgResult<T> {
  const args = argv as ParsedArgs;
  const result: ParseArgResult<T> = {};

  for (const key in options) {
    const opt = options[key] as ParseArgField;
    if (opt.short && args[opt.short]) {
      result[key] = args[opt.short];
    } else if (args[key]) {
      result[key] = args[key];
    }
  }

  return result;
}

export function printHelp(options: ParseArgOptions, usages?: string[]): void {
  process.nextTick(() => {
    if (usages && usages.length) {
      for (const usage of usages) {
        console.log(usage);
      }
      console.log('');
    }

    const helps = Object.entries(options).map(([key, opt]) => {
      let keys = opt.short ? `-${opt.short}, ` : '    ';
      keys += `--${key}`;
      if (opt.arg) {
        keys += ` <${opt.arg}>`;
      } else if (opt.optArg) {
        keys += ` [${opt.arg}]`;
      }

      return { keys, help: opt.help || '' };
    });

    console.log('选项:');
    LISA.cli.table(helps, {
      keys: { minWidth: 30 },
      help: {},
    }, { 'no-header': true });
  });
}
