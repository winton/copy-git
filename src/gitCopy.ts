import path from "path"
import fs from "fs-extra"
import tmp from "tmp-promise"

import copyConfig, { CopyConfigRecord } from "./copyConfig"
import spawn from "./spawn"
import * as transforms from "./transforms"

export const GIT_REGEX = /\.git(\/|$)/

export class GitCopy {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    args = args.concat([])

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
    let { source } = record

    if (!source.length) {
      return
    }

    const { dest, repo, transform } = record
    const tmpDir = await this.clone(repo)

    if (match && match.length) {
      source = await this.match(tmpDir.path, match, source)
    }

    if (!source.length) {
      return
    }

    const transformDir = await tmp.dir({
      unsafeCleanup: true,
    })

    const transformCpCmd = /* bash */ `
      cp -r \
        ${source.join(" ")} \
        ${transformDir.path}
    `

    await spawn.run("sh", {
      args: ["-c", transformCpCmd],
      cwd: tmpDir.path,
      stdout: true,
    })

    if (transform) {
      const paths = await this.ls(transformDir.path)

      for (const relPath of paths) {
        const p = path.join(transformDir.path, relPath)
        let out = (await fs.readFile(p)).toString()

        for (const t of transform) {
          if (transforms[t.type]) {
            out = await transforms[t.type](out, p, t)
          }
        }

        if (out) {
          await fs.writeFile(p, out)
        }
      }
    }

    const destCpCmd = /* bash */ `
      cp -r \
        ${transformDir.path}/* \
        ${path.resolve(dest)}
    `

    await spawn.run("sh", {
      args: ["-c", destCpCmd],
      cwd: tmpDir.path,
      stdout: true,
    })

    await transformDir.cleanup()

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

  async ls(cwd: string, source: string[] = ["."]) {
    const { code, out } = await spawn.run("sh", {
      args: ["-c", `find ${source.join(" ")} -type f`],
      cwd,
    })

    return code === 0 ? out.trim().split("\r\n") : []
  }
}

export default new GitCopy()
