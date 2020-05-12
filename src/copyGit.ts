import path from "path"
import fs from "fs-extra"
import tmp from "tmp-promise"

import copyConfig, { CopyConfigRecord } from "./copyConfig"
import ls from "./ls"
import spawn from "./spawn"
import * as transforms from "./transforms"

export const GIT_REGEX = /\.git(\/|$)/

export class CopyGit {
  tmpCache: Record<string, tmp.DirectoryResult> = {}

  async copy(args: string[]) {
    let transform: CopyConfigRecord["transform"]
    ;[args, transform] = this.parseArgs(args.concat([]))

    if (args[0]?.match(GIT_REGEX)) {
      const dest = args.pop()

      await this.copyFromGit({
        repo: args[0],
        dest,
        source: args.slice(1),
        transform,
      })
    } else if (args[args.length - 1]?.match(GIT_REGEX)) {
      const repo = args.pop()
      const dest = args.pop()

      await this.copyFromLocal({
        repo,
        dest,
        source: args,
        transform,
      })
    } else {
      await this.replayCopies(args)
    }
  }

  async copyFromGitBasic(
    record: CopyConfigRecord,
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

    const {
      sourcePaths,
      transformDir,
    } = await this.transform(record, tmpDir)

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

    if (transformDir) {
      await transformDir.cleanup()
    }

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

    await spawn.run("rm", {
      args: ["-rf", ".git"],
      cwd: tmpDir.path,
      stdout: true,
    })

    return tmpDir
  }

  parseArgs(
    args: string[]
  ): [string[], CopyConfigRecord["transform"]] {
    const options: Record<string, string[]> = {}
    const optionRegex = /^-\w$/

    let lastMatch: boolean

    args = args
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

    const transform = (options["-f"] || [])
      .map((find: string, i) => {
        if (options["-r"] && options["-r"][i]) {
          return {
            type: "findReplace",
            find,
            replace: options["-r"][i],
          }
        }
      })
      .filter((t) => t)

    return [args, transform.length ? transform : undefined]
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

  async transform(
    record: CopyConfigRecord,
    tmpDir: tmp.DirectoryResult
  ) {
    const { source, transform } = record

    if (!transform) {
      return { sourcePaths: source.join(" ") }
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

    const paths = await ls(transformDir.path)

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

    return {
      sourcePaths: transformDir.path + "/*",
      transformDir,
    }
  }
}

export default new CopyGit()
