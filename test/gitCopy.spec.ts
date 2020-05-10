import { join } from "path"
import expect from "./expect"
import spawn from "../src/spawn"
import copyConfig from "../src/copyConfig"

const root = join(__dirname, "../")

describe("gitCopy", () => {
  beforeEach(async () => {
    await spawn.run("sh", {
      args: ["-c", "rm *.ts .*.yml"],
      cwd: join(root, "test/fixture"),
    })
  })

  it("copyFromGit", async () => {
    const cwd = join(root, "test/fixture")

    await spawn.run(join(root, "bin/git-copy"), {
      args: [
        "git@github.com:winton/git-copy.git",
        "src/*.ts",
        "test/expect.ts",
        ".",
      ],
      cwd,
      stdout: true,
    })

    const { out } = await spawn.run("sh", {
      args: ["-c", "ls *.ts"],
      cwd: join(root, "test/fixture"),
    })

    expect(out).toBe(
      "copyConfig.ts\texpect.ts\tgitCopy.ts\tspawn.ts\r\n"
    )

    copyConfig.configPath = join(cwd, ".gitcopy.yml")

    expect(await copyConfig.load()).toEqual({
      "git@github.com:winton/git-copy.git": {
        copies: [
          {
            dest: ".",
            source: ["src/*.ts", "test/expect.ts"],
          },
        ],
      },
    })
  })
})
