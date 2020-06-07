import path from "path"
import fs from "fs-extra"
import tmp from "tmp-promise"

import copyConfig, {
  CopyConfigRecord,
  IncomingConfigRecord,
} from "./copyConfig"
import ls from "./ls"
import spawn from "./spawn"

export const GIT_REGEX = /\.git(\/|$)/

export class CopyGit {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    args = this.parseArgs(args.concat([]))

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

    const sourcePaths = record.source.join(" ")

    await fs.mkdirp(path.resolve(dest))

    const destCpCmd = /* bash */ `
      shopt -s dotglob;
      cp -r \
        ${sourcePaths} \
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

    await Promise.all([tmpDir.cleanup(), copyConfig.load()])

    copyConfig.incoming(record)
    await copyConfig.save()
  }

  async copyFromLocal(record: CopyConfigRecord) {}

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

  parseArgs(args: string[]): string[] {
    const options: Record<string, string[]> = {}
    const optionRegex = /^-\w$/

    let lastMatch: boolean

    return args
      .map((arg, i) => {
        if (lastMatch) {
          lastMatch = false
        } else if (arg.match(optionRegex) && args[i + 1]) {
          lastMatch = true
          options[arg] = options[arg] || []
          options[arg].push(args[i + 1])
        } else {
          return arg
        }
      })
      .filter((a) => a)
  }

  async replayCopies(match: string[]) {
    const { incoming } = await copyConfig.load()

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
