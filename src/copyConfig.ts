import path from "path"
import fs from "fs-extra"
import yaml from "js-yaml"

export interface CopyConfigRecord {
  copies?: { source: string[]; dest: string }[]
  processors?: Record<string, any>
}

export class CopyConfig {
  config: Record<string, CopyConfigRecord> = {}
  configPath = path.resolve(".gitcopy.yml")

  async load() {
    if (!(await fs.pathExists(this.configPath))) {
      return {}
    }

    const raw = await fs.readFile(this.configPath)

    return (this.config = yaml.load(raw.toString()))
  }

  copy(repo: string, dest: string, source: string[]) {
    this.config[repo] = this.config[repo] || {
      copies: [],
    }

    this.config[repo].copies.push({
      dest,
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
