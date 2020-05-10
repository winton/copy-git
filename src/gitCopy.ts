import path from "path"
import tmp from "tmp-promise"
import spawn from "./spawn"
import copyConfig from "./copyConfig"

export const GIT_REGEX = /\.git(\/|$)/

export class GitCopy {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    if (!args.length) {
      await this.replayCopies()
    } else if (args[0].match(GIT_REGEX)) {
      const dest = args.pop()
      await this.copyFromGit(args[0], dest, args.slice(1))
    } else if (args[args.length - 1].match(GIT_REGEX)) {
      const repo = args.pop()
      const dest = args.pop()
      await this.copyFromLocal(repo, dest, args)
    }
  }

  async copyFromGitBasic(
    repo: string,
    dest: string,
    source: string[]
  ) {
    const tmpDir = await this.clone(repo)

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

  async replayCopies() {
    const config = await copyConfig.load()

    for (const repo in config) {
      for (const { dest, source } of config[repo].copies) {
        await this.copyFromGitBasic(repo, dest, source)
      }
    }

    await Promise.all(
      Object.values(this.tmpCache).map((tmpDir) =>
        tmpDir.cleanup()
      )
    )
  }
}

export default new GitCopy()
