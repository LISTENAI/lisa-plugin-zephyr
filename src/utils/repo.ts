import simpleGit, { SimpleGit } from 'simple-git';

async function rev(git: SimpleGit): Promise<string | null> {
  let commit, branch;
  try {
    commit = (await git.revparse(['--short', 'HEAD'])).trim();
  } catch (e) {
    return null;  // not a git repository
  }
  try {
    branch = (await git.raw(['symbolic-ref', '--short', 'HEAD'])).trim();
    return branch;
  } catch (e) {
    return commit;  // detached
  }
}

export async function getCommit(git: SimpleGit): Promise<string | null> {
  let commit;
  try {
    commit = (await git.revparse(['--short', 'HEAD'])).trim();
    return commit;
  } catch (e) {
    return null;
  }
}

export async function getBranch(git: SimpleGit): Promise<string | null> {
  let branch;
  try {
    branch = (await git.raw(['symbolic-ref', '--short', 'HEAD'])).trim();
    return branch;
  } catch (e) {
    return null;
  }
}


export async function clean(git: SimpleGit): Promise<boolean> {
  const status = await git.status(['--porcelain']);
  return status.isClean();
}

export async function getRepoStatus(path: string): Promise<string | null> {
  const git = simpleGit(path);
  const branch = await rev(git);
  if (!branch) {
    return null;
  }
  const isClean = await clean(git);
  return isClean ? branch : `${branch}*`;
}
