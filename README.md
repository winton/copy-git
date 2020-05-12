# copy-git

Copy files from external git repos and easily pull updates.

## Install

```bash
npm install copy-git
```

## Copy files from a git repo

> `copy-git [srcRepo] [srcPath...] [destPath]`

For example, let's copy this project's source files to your current directory:

```bash
copy-git git@github.com:winton/copy-git.git "src/*.ts" .
```

The `copy-git` command generates `.copygit.yml`, allows you to [automatically update](#automatic-update).

Add a hashtag + ID to the end of `srcRepo` to hardcode a specific commit version.

## Automatic update

Run `copy-git` from a directory that has a `.copygit.yml` file:

```bash
copy-git
```

You may also specify certain paths to update:

```bash
copy-git src/*
```

## Find/replace after copy

> `copy-git [srcRepo] [srcPath...] [destPath] -f FIND -r REPLACE`

The `-f` (find) and `-r` (replace) options transform copied files:

```bash
copy-git git@github.com:winton/copy-git.git "src/*.ts" src/copyGit -f CopyGit -r CopyGit2
```

The `-f` option may also be a regular expression:

```bash
copy-git git@github.com:winton/copy-git.git "src/*.ts" src/copyGit -f "/([cC])opyGit/g" -r "$1opyGit2"
```
