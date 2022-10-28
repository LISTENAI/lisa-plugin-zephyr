import LISA from '@listenai/lisa_core';
import { ParsedArgs } from 'minimist';

interface ParseArgFieldBase {
  short?: string;
  help?: string;
}

interface ParseArgFieldWithArg extends ParseArgFieldBase {
  arg: string;
}

interface ParseArgFieldWithOptionalArg extends ParseArgFieldBase {
  optArg: string;
}

type ParseArgField = ParseArgFieldBase | ParseArgFieldWithArg | ParseArgFieldWithOptionalArg

export type ParseArgOptions = Record<string, ParseArgField>;

type ParseArgResult<Fields> = {
  [Key in keyof Fields]?:
  Fields[Extract<keyof Fields, Key>] extends ParseArgFieldWithOptionalArg
  ? string | boolean
  : Fields[Extract<keyof Fields, Key>] extends ParseArgFieldWithArg
  ? string
  : boolean;
};

export default function parseArgs<T extends ParseArgOptions>(argv: string[] | ParsedArgs, options: T): {
  args: ParseArgResult<T>;
  printHelp: (usages?: string[]) => void;
} {
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

  return { args: result, printHelp: (usages) => printHelp(options, usages) };
}

function printHelp<T extends ParseArgOptions >(options: T, usages?: string[]): void {
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
      if ((<ParseArgFieldWithArg>opt).arg) {
        keys += ` <${(<ParseArgFieldWithArg>opt).arg}>`;
      } else if ((<ParseArgFieldWithOptionalArg>opt).optArg) {
        keys += ` [${(<ParseArgFieldWithOptionalArg>opt).optArg}]`;
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
