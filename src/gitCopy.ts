import path from "path"
import tmp from "tmp-promise"
import spawn from "./spawn"
import copyConfig, { CopyConfigRecord } from "./copyConfig"

export const GIT_REGEX = /\.git(\/|$)/

export class GitCopy {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    if (args[0]?.match(GIT_REGEX)) {
      const dest = args.pop()

      await this.copyFromGit({
        repo: args[0],
        dest,
        source: args.slice(1),
      })
    } else if (args[args.length - 1]?.match(GIT_REGEX)) {
      const repo = args.pop()
      const dest = args.pop()

      await this.copyFromLocal({ repo, dest, source: args })
    } else {
      await this.replayCopies(args)
    }
  }

  async copyFromGitBasic(
    record: CopyConfigRecord,
    match: string[] = undefined
  ) {
    const { dest, repo } = record
    const tmpDir = await this.clone(repo)

    let { source } = record

    if (match && match.length) {
      source = await this.match(tmpDir.path, match, source)
    }

    if (!source.length) {
      return
    }

    const cpCmd = /* bash */ `
      cp -r \
        ${source.join(" ")} \
        ${path.resolve(dest)}
    `

    await spawn.run("sh", {
      args: ["-c", cpCmd],
      cwd: tmpDir.path,
      stdout: true,
    })

    return tmpDir
  }

  async copyFromGit(record: CopyConfigRecord) {
    const tmpDir = await this.copyFromGitBasic(record)

    await Promise.all([tmpDir.cleanup(), copyConfig.load()])

    copyConfig.copy(record)
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

    return tmpDir
  }

  async replayCopies(match: string[]) {
    const config = await copyConfig.load()

    for (const record of config) {
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
      this.ls(cwd, match),
      this.ls(cwd, source),
    ])

    const matchCache = {}
    const sourceCache = {}

    matches.forEach((k) => (matchCache[k] = k))
    sources.forEach((k) => (sourceCache[k] = k))

    return Object.keys(matchCache)
      .map((k) => sourceCache[k])
      .filter((k) => k)
  }

  async ls(cwd: string, source: string[]) {
    const { code, out } = await spawn.run("sh", {
      args: ["-c", `CLICOLOR="" ls -1 ${source.join(" ")}`],
      cwd,
    })

    return code === 0 ? out.trim().split("\r\n") : []
  }
}

export default new GitCopy()
