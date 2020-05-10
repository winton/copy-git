import { join } from "path"
import fs from "fs-extra"
import expect from "./expect"
import spawn from "../src/spawn"
import copyConfig from "../src/copyConfig"
import gitCopy from "../src/gitCopy"

const root = join(__dirname, "../")
const fixture = join(root, "test/fixture")

async function expectFixtureFiles(
  files: string[] = undefined
) {
  expect(await gitCopy.ls(fixture, ["*.ts"])).toEqual(
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
    cwd: fixture,
  })
}

describe("gitCopy", () => {
  beforeEach(clearFixture)
  after(clearFixture)

  it("copyFromGit", async () => {
    await spawn.run(join(root, "bin/git-copy"), {
      args: [
        "git@github.com:winton/git-copy.git",
        "src/*.ts",
        "test/expect.ts",
        ".",
      ],
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles()

    copyConfig.configPath = join(fixture, ".gitcopy.yml")

    expect(await copyConfig.load()).toEqual([
      {
        dest: ".",
        source: ["src/*.ts", "test/expect.ts"],
        repo: "git@github.com:winton/git-copy.git",
      },
    ])

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: fixture,
    })

    await spawn.run(join(root, "bin/git-copy"), {
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles()

    await spawn.run("sh", {
      args: ["-c", "rm *.ts"],
      cwd: fixture,
    })

    await spawn.run(join(root, "bin/git-copy"), {
      args: ["src/gitCopy.ts"],
      cwd: fixture,
      stdout: true,
    })

    await expectFixtureFiles(["gitCopy.ts"])
    await copyConfig.load()

    copyConfig.transform(0, {
      type: "findReplace",
      find: "GitCopy",
      replace: "TestCopy",
    })

    await copyConfig.save()

    await spawn.run(join(root, "bin/git-copy"), {
      args: ["src/gitCopy.ts"],
      cwd: fixture,
      stdout: true,
    })

    const out = (
      await fs.readFile(join(fixture, "gitCopy.ts"))
    ).toString()

    expect(out.includes("class TestCopy {")).toBeTruthy()
  }).timeout(10000)
})
