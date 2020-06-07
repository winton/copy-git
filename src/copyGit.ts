import path from "path"
import fs from "fs-extra"
import tmp from "tmp-promise"

import config, { IncomingConfigRecord } from "./config"
import spawn from "./spawn"

export const GIT_REGEX = /\.git(\/|$)/

export class CopyGit {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    const dest = args.pop()

    await this.copyFromGit({
      repo: args[0],
      dest,
      source: args.slice(1),
    })
  }

  async copyFromGitBasic(record: IncomingConfigRecord) {
    if (!record.source.length) {
      record.source = ["*"]
    }

    const { dest, repo } = record
    const tmpDir = await this.clone(repo)

    const destCpCmd = /* bash */ `
      shopt -s dotglob;
      cp -r \
        ${record.source.join(" ")} \
        ${path.resolve(dest)}
    `

    await spawn.run("sh", {
      args: ["-c", destCpCmd],
      cwd: tmpDir.path,
      stdout: true,
    })

    return tmpDir
  }

  async copyFromGit(record: IncomingConfigRecord) {
    const tmpDir = await this.copyFromGitBasic(record)

    await Promise.all([tmpDir.cleanup(), config.load()])

    config.pushCopy(record)
    await config.save()
  }

  async clone(repo: string) {
    if (this.tmpCache[repo]) {
      return this.tmpCache[repo]
    }

    const tmpDir = await tmp.dir({
      unsafeCleanup: true,
    })

    this.tmpCache[repo] = tmpDir

    const split = repo.split("#")
    repo = split[0]

    await spawn.run("git", {
      args: ["clone", repo, "."],
      cwd: tmpDir.path,
      stdout: true,
    })

    if (split[1]) {
      await spawn.run("git", {
        args: ["checkout", split[1]],
        cwd: tmpDir.path,
        stdout: true,
      })
    }

    await spawn.run("rm", {
      args: ["-rf", ".git"],
      cwd: tmpDir.path,
      stdout: true,
    })

    return tmpDir
  }
}

export default new CopyGit()
