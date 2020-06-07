import path from "path"
import fs from "fs-extra"
import yaml from "js-yaml"

export interface IncomingConfigRecord {
  repo: string
  source: string[]
  dest: string
}

export interface CopyConfigRecord {
  incoming: {
    repo: string
    source: string[]
    dest: string
  }[]

  outgoing?: Record<
    string,
    {
      source: string[]
      dest: string
    }
  >
}

export class CopyConfig {
  config: CopyConfigRecord = { incoming: [] }
  configPath = path.resolve(".copygit.yml")

  async load() {
    if (!(await fs.pathExists(this.configPath))) {
      return { incoming: [] }
    }

    const raw = await fs.readFile(this.configPath)
    this.config = yaml.load(raw.toString())

    return this.config
  }

  incoming(record: IncomingConfigRecord) {
    record = Object.assign({}, record)
    this.config.incoming = this.config.incoming.concat(
      record
    )
  }

  async save() {
    await fs.writeFile(
      this.configPath,
      yaml.dump(this.config)
    )
  }
}

export default new CopyConfig()
