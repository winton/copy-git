import path from "path"
import fs from "fs-extra"
import yaml from "js-yaml"

export interface IncomingConfigRecord {
  repo: string
  source: string[]
  dest: string
}

export interface ConfigRecord {
  copies: IncomingConfigRecord[]
  inputs?: Record<string, Record<string, any>>
}

export class Config {
  data: ConfigRecord = { copies: [] }
  path = path.resolve(".copygit.yml")

  async load() {
    if (!(await fs.pathExists(this.path))) {
      return { copies: [] }
    }

    const raw = await fs.readFile(this.path)
    this.data = yaml.load(raw.toString())

    return this.data
  }

  pushCopy(record: IncomingConfigRecord) {
    record = Object.assign({}, record)
    this.data.copies = this.data.copies.concat(record)
  }

  async save() {
    await fs.writeFile(this.path, yaml.dump(this.data))
  }
}

export default new Config()
