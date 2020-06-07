import { join } from "path"
import fs from "fs-extra"
import expect from "./expect"
import copyConfig from "../src/copyConfig"
import ls from "../src/ls"
import spawn from "../src/spawn"

const root = join(__dirname, "../")
const fixture = join(root, "test/fixture")

async function expectFixtureFiles(
  files: string[] = undefined
) {
  expect(await ls(fixture, ["*.ts"])).toEqual(
    files || [
      "copyConfig.ts",
      "copyGit.ts",
      "expect.ts",
      "ls.ts",
      "spawn.ts",
      "transforms.ts",
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
      args: [
        "git@github.com:winton/copy-git.git",
        "src/*.ts",
        "test/expect.ts",
        ".",
      ],
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles()

    copyConfig.configPath = join(fixture, ".copygit.yml")

    expect(await copyConfig.load()).toEqual({
      incoming: [
        {
          dest: ".",
          source: ["src/*.ts", "test/expect.ts"],
          repo: "git@github.com:winton/copy-git.git",
        },
      ],
    })

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: fixture,
    })

    await spawn.run(join(root, "bin/copy-git"), {
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles()

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: fixture,
    })

    await spawn.run(join(root, "bin/copy-git"), {
      args: ["src/copyGit.ts"],
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles(["copyGit.ts"])
  }).timeout(10000)
})
