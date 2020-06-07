import { join } from "path"
import expect from "./expect"
import config from "../src/config"
import ls from "../src/ls"
import spawn from "../src/spawn"

const root = join(__dirname, "../")
const fixture = join(root, "test/fixture")
const repo = "git@github.com:winton/copy-git.git"

async function expectFixtureFiles(
  files: string[] = undefined
) {
  expect(await ls(fixture, ["*.ts"])).toEqual(
    files || [
      "config.ts",
      "copyGit.ts",
      "expect.ts",
      "ls.ts",
      "spawn.ts",
    ]
  )
}

async function clearFixture() {
  await spawn.run("sh", {
    args: ["-c", "rm *.ts .*.yml"],
    cwd: fixture,
  })
}

describe("copyGit", () => {
  beforeEach(clearFixture)
  after(clearFixture)

  it("copyFromGit", async () => {
    await spawn.run(join(root, "bin/copy-git"), {
      args: [repo, "src/*.ts", "test/expect.ts", "."],
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles()

    config.path = join(fixture, ".copygit.yml")

    expect(await config.load()).toEqual({
      copies: [
        {
          dest: ".",
          source: ["src/*.ts", "test/expect.ts"],
          repo,
        },
      ],
    })

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: fixture,
    })

    await spawn.run(join(root, "bin/copy-git"), {
      args: [repo, "src/copyGit.ts", "."],
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles(["copyGit.ts"])
  }).timeout(10000)
})
