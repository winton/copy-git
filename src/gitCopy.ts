import path from "path"
import tmp from "tmp-promise"
import spawn from "./spawn"
import copyConfig from "./copyConfig"

export const GIT_REGEX = /\.git(\/|$)/

export class GitCopy {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    if (args[0]?.match(GIT_REGEX)) {
      const dest = args.pop()
      await this.copyFromGit(args[0], dest, args.slice(1))
    } else if (args[args.length - 1]?.match(GIT_REGEX)) {
      const repo = args.pop()
      const dest = args.pop()
      await this.copyFromLocal(repo, dest, args)
    } else {
      await this.replayCopies(args)
    }
  }

  async copyFromGitBasic(
    repo: string,
    dest: string,
    source: string[],
    match: string[] = undefined
  ) {
    const tmpDir = await this.clone(repo)

    if (match && match.length) {
      source = await this.match(tmpDir.path, match, source)
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

  async copyFromGit(
    repo: string,
    dest: string,
    source: string[]
  ) {
    const tmpDir = await this.copyFromGitBasic(
      repo,
      dest,
      source
    )

    await Promise.all([tmpDir.cleanup(), copyConfig.load()])

    copyConfig.copy(repo, dest, source)
    await copyConfig.save()
  }

  async copyFromLocal(
    repo: string,
    dest: string,
    source: string[]
  ) {}

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

    for (const { dest, repo, source } of config) {
      await this.copyFromGitBasic(repo, dest, source, match)
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
