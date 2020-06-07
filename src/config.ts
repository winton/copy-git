import path from "path"
import fs from "fs-extra"
import yaml from "js-yaml"

export interface IncomingConfigRecord {
  repo: string
  source: string[]
  dest: string
}

export interface OutgoingConfigRecord {
  source: string[]
  dest: string
}

export interface ConfigRecord {
  incoming: IncomingConfigRecord[]
  outgoing?: Record<string, OutgoingConfigRecord>
}

export class Config {
  data: ConfigRecord = { incoming: [] }
  path = path.resolve(".copygit.yml")

  async load() {
    if (!(await fs.pathExists(this.path))) {
      return { incoming: [] }
    }

    const raw = await fs.readFile(this.path)
    this.data = yaml.load(raw.toString())

    return this.data
  }

  incoming(record: IncomingConfigRecord) {
    record = Object.assign({}, record)
    this.data.incoming = this.data.incoming.concat(record)
  }

  async save() {
    await fs.writeFile(this.path, yaml.dump(this.data))
  }
}

export default new Config()
