import { spawn as ptyRun, IPty } from "node-pty"

export interface SpawnOutput {
  code: number
  out: string
  signal: number
}

export interface SpawnOptions {
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  stdout?: boolean
}

class Spawn {
  async runWithPty(
    command: string,
    options: SpawnOptions = {}
  ): Promise<[IPty, Promise<SpawnOutput>]> {
    const { args = [], cwd, env, stdout } = options

    const cols = process.stdout.columns
    const rows = process.stdout.rows

    const pty = ptyRun(command, args, {
      cols,
      cwd,
      env,
      name: "xterm-color",
      rows,
    })

    let out = ""

    pty.on("data", (data): void => {
      out += data

      if (stdout) {
        process.stdout.write(data)
      }
    })

    const promise = new Promise((resolve): void => {
      pty.on("exit", (code, signal): void =>
        resolve({ code, out, signal })
      )
    }) as Promise<SpawnOutput>

    return [pty, promise]
  }

  async run(
    command: string,
    options: SpawnOptions = {}
  ): Promise<SpawnOutput> {
    const [, promise] = await this.runWithPty(
      command,
      options
    )
    return await promise
  }
}

export default new Spawn()
