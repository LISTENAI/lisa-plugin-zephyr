import { resolve } from 'path';
import { CompletionItem, TabtabEnv } from 'tabtab';
import * as execa from 'execa';
import { getEnv } from './env';

const GET_COMP_SH = resolve(__dirname, '..', 'scripts', 'get-completion.sh');

export default async function completion(env: TabtabEnv): Promise<CompletionItem[] | string[] | undefined> {
  return await getWestCompletion(['west', ...env.line.split(' ').slice(2)], env.words - 1);
}

async function getWestCompletion(words: string[], cword: number): Promise<string[]> {
  const { stdout } = await execa(GET_COMP_SH, words, {
    env: await getEnv(),
  });

  return stdout.split(' ');
}
