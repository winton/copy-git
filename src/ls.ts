import spawn from "./spawn"

export async function ls(
  cwd: string,
  source: string[] = ["."]
) {
  const { code, out } = await spawn.run("sh", {
    args: ["-c", `find ${source.join(" ")} -type f`],
    cwd,
  })

  return code === 0 ? out.trim().split("\r\n") : []
}

export default ls
