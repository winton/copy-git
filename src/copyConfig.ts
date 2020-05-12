import path from "path"
import fs from "fs-extra"
import yaml from "js-yaml"

export interface CopyConfigRecord {
  repo: string
  source: string[]
  dest: string
  transform?: Record<string, any>[]
}

export class CopyConfig {
  config: CopyConfigRecord[] = []
  configPath = path.resolve(".copygit.yml")

  async load() {
    if (!(await fs.pathExists(this.configPath))) {
      return []
    }

    const raw = await fs.readFile(this.configPath)
    this.config = yaml.load(raw.toString())

    return this.config
  }

  copy(record: CopyConfigRecord) {
    const { dest, repo, source } = record

    this.config = this.config.concat({
      dest,
      repo,
      source,
    })
  }

  transform(index: number, record: Record<string, any>) {
    const config = this.config[index]
    config.transform = config.transform || []
    config.transform.push(record)
  }

  async save() {
    await fs.writeFile(
      this.configPath,
      yaml.dump(this.config)
    )
  }
}

export default new CopyConfig()
