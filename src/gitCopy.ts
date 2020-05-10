import path from "path"
import tmp from "tmp-promise"
import spawn from "./spawn"

export class GitCopy {
  async copy(args: string[]) {
    if (args[0].match(/\.git(\/|$)/)) {
      const dest = args.pop()
      await this.copyFromGit(
        args[0],
        dest,
        ...args.slice(1)
      )
    } else {
      const repo = args.pop()
      const dest = args.pop()
      await this.copyFromLocal(repo, dest, ...args)
    }
  }

  async copyFromGit(
    repo: string,
    dest: string,
    ...src: string[]
  ) {
    const tmpDir = await tmp.dir({
      unsafeCleanup: true,
    })
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

    const cpCmd = /* bash */ `
      cp -r \
        ${src.join(" ")} \
        ${path.resolve(process.cwd(), dest)}
    `

    await spawn.run("sh", {
      args: ["-c", cpCmd],
      cwd: tmpDir.path,
      stdout: true,
    })

    await tmpDir.cleanup()
  }

  async copyFromLocal(
    repo: string,
    dest: string,
    ...src: string[]
  ) {}
}

export default new GitCopy()
