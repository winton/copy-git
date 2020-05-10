# git-copy

Copy files from external git repos and easily pull updates.

## Install

```bash
npm install git-copy
```

## Copy files from a git repo

```bash
# git-copy [srcRepo] [srcPath...] [destPath]
git-copy git@github.com:winton/git-copy.git "src/*.ts" src/gitCopy
```

The `git-copy` command generates `.gitcopy.yml`, which keeps record of file sources and destinations.

Add a hashtag + ID to the end of `srcRepo` to hardcode a specific commit version.

## Update copied files

Run `git-copy` without arguments within a directory that has a `.gitcopy.yml` file:

```bash
git-copy
```

You may also specify specific paths to update:

```bash
git-copy src/*
```

## Copy files upstream

Reverse the arguments to copy local files to an external git repo:

```bash
# git-copy [srcPath...] [destPath] [destRepo]
git-copy src/gitCopy/*.ts src git@github.com:winton/git-copy.git
```

You must have write access to the `destRepo`. After you are prompted for a branch name and commit message, changes automatically commit and push.
