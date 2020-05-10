import { join } from "path"
import expect from "./expect"
import spawn from "../src/spawn"

const root = join(__dirname, "../")

describe("gitCopy", () => {
  beforeEach(async () => {
    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: join(root, "test/fixture"),
    })
  })

  it("copyFromGit", async () => {
    await spawn.run(join(root, "bin/git-copy"), {
      args: [
        "git@github.com:winton/git-copy.git",
        "src/*.ts",
        ".",
      ],
      cwd: join(root, "test/fixture"),
      stdout: true,
    })

    const { out } = await spawn.run("sh", {
      args: ["-c", "ls *.ts"],
      cwd: join(root, "test/fixture"),
    })

    expect(out).toBe("gitCopy.ts\tspawn.ts\r\n")
  })
})
