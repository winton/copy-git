import path from "path"
import fs from "fs-extra"
import tmp from "tmp-promise"

import config, { IncomingConfigRecord } from "./config"
import ls from "./ls"
import spawn from "./spawn"

export const GIT_REGEX = /\.git(\/|$)/

export class CopyGit {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    if (args[0]?.match(GIT_REGEX)) {
      const dest = args.pop()

      await this.copyFromGit({
        repo: args[0],
        dest,
        source: args.slice(1),
      })
    } else {
      await this.replayCopies(args)
    }
  }

  async copyFromGitBasic(
    record: IncomingConfigRecord,
    match: string[] = undefined
  ) {
    if (!record.source.length) {
      return
    }

    const { dest, repo } = record
    const tmpDir = await this.clone(repo)

    if (match && match.length) {
      record.source = await this.match(
        tmpDir.path,
        match,
        record.source
      )
    }

    if (!record.source.length) {
      return
    }

    await fs.mkdirp(path.resolve(dest))

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

    config.incoming(record)
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

  async replayCopies(match: string[]) {
    const { incoming } = await config.load()

    for (const record of incoming) {
      await this.copyFromGitBasic(record, match)
    }

    await Promise.all(
      Object.values(this.tmpCache).map((tmpDir) =>
        tmpDir.cleanup()
      )
    )
  }

  async match(
    cwd: string,
    match: string[],
    source: string[]
  ) {
    const [matches, sources] = await Promise.all([
      ls(cwd, match),
      ls(cwd, source),
    ])

    const matchCache = {}
    const sourceCache = {}

    matches.forEach((k) => (matchCache[k] = k))
    sources.forEach((k) => (sourceCache[k] = k))

    return Object.keys(matchCache)
      .map((k) => sourceCache[k])
      .filter((k) => k)
  }
}

export default new CopyGit()
