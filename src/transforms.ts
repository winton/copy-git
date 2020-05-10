export interface FindReplace {
  type: "findReplace"
  find: string
  replace: string
  flags?: string
}

export function findReplace(
  out: string,
  path: string,
  t: FindReplace
) {
  return out.replace(
    new RegExp(t.find, t.flags || "gm"),
    t.replace
  )
}
