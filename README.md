# copy-git

Copy files from external git repos and easily pull updates.

## Install

```bash
npm install copy-git
```

## Copy from git to local

### Usage

> `copy-git [srcRepo] [srcPath...] [destPath]`

### Examples

Copy this project's `src` files to your current directory:

```bash
copy-git git@github.com:winton/copy-git.git "src/*.ts" .
```

The command generates a file `.copygit.yml`, which allows you to [update copied files](#update-copied-files).

Add a pound sign at the end of the `srcRepo` to copy files from a specific version:

```bash
copy-git git@github.com:winton/copy-git.git#6093d11 "src/*.ts" .
```

## Update copied files

### Usage

> `copy-git [destPath...]`

### Examples

To update all copied files, run `copy-git` without arguments from a directory that has a `.copygit.yml` file:

```bash
copy-git
```

You may also limit the updates to certain files:

```bash
copy-git src/*
```

## Find/replace after copy

### Usage

> `copy-git [srcRepo] [srcPath...] [destPath] -f FIND -r REPLACE`

### Examples

The `-f` (find) and `-r` (replace) options transform copied files:

```bash
copy-git git@github.com:winton/copy-git.git "src/*.ts" src/copyGit -f CopyGit -r CopyGit2
```

The `-f` option may also be a regular expression:

```bash
copy-git git@github.com:winton/copy-git.git "src/*.ts" src/copyGit -f "/([cC])opyGit/g" -r "$1opyGit2"
```

You may specify more than one find/replace by adding more `-f FIND -r REPLACE` arguments.
