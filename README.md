# copy-git

Copy files from external git repos and easily pull updates.

## Install

```bash
npm install copy-git
```

## Copy files from a git repo

```bash
# copy-git [srcRepo] [srcPath...] [destPath]
copy-git git@github.com:winton/copy-git.git "src/*.ts" src/copyGit
```

The `copy-git` command generates `.copygit.yml`, which keeps record of file sources and destinations.

Add a hashtag + ID to the end of `srcRepo` to hardcode a specific commit version.

## Update copied files

Run `copy-git` without arguments within a directory that has a `.copygit.yml` file:

```bash
copy-git
```

You may also specify paths to update:

```bash
copy-git src/*
```

## Copy files upstream

Reverse the arguments to copy local files to an external git repo:

```bash
# copy-git [srcPath...] [destPath] [destRepo]
copy-git src/copyGit/*.ts src git@github.com:winton/copy-git.git
```

You must have write access to the `destRepo`. After you are prompted for a branch name and commit message, changes automatically commit and push.
