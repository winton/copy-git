import path from "path"
import fs from "fs-extra"
import yaml from "js-yaml"

export interface CopyConfigRecord {
  repo: string
  source: string[]
  dest: string
  processors?: Record<string, any>
}

export class CopyConfig {
  config: CopyConfigRecord[] = []
  configPath = path.resolve(".gitcopy.yml")

  async load() {
    if (!(await fs.pathExists(this.configPath))) {
      return []
    }

    const raw = await fs.readFile(this.configPath)

    this.config = yaml.load(raw.toString())

    return this.config
  }

  copy(repo: string, dest: string, source: string[]) {
    this.config = this.config.concat({
      dest,
      repo,
      source,
    })
  }

  async save() {
    await fs.writeFile(
      this.configPath,
      yaml.dump(this.config)
    )
  }
}

export default new CopyConfig()
