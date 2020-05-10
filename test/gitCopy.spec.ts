import { join } from "path"
import expect from "./expect"
import spawn from "../src/spawn"
import copyConfig from "../src/copyConfig"
import gitCopy from "../src/gitCopy"

const root = join(__dirname, "../")

async function expectFixtureFiles(
  files: string[] = undefined
) {
  expect(
    await gitCopy.ls(join(root, "test/fixture"), ["*.ts"])
  ).toEqual(
    files || [
      "copyConfig.ts",
      "expect.ts",
      "gitCopy.ts",
      "spawn.ts",
    ]
  )
}

async function clearFixture() {
  await spawn.run("sh", {
    args: ["-c", "rm *.ts .*.yml"],
    cwd: join(root, "test/fixture"),
  })
}

describe("gitCopy", () => {
  beforeEach(clearFixture)
  after(clearFixture)

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

    await expectFixtureFiles()

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

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: join(root, "test/fixture"),
    })

    await spawn.run(join(root, "bin/git-copy"), {
      cwd,
      stdout: true,
    })

    await expectFixtureFiles()

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: join(root, "test/fixture"),
    })

    await spawn.run(join(root, "bin/git-copy"), {
      args: ["src/gitCopy.ts"],
      cwd,
      stdout: true,
    })

    await expectFixtureFiles(["gitCopy.ts"])
  }).timeout(10000)
})
