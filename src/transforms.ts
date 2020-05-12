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
  let find: string | RegExp = t.find
  const regex = t.find.match(/\/([^/]+)\/([gimsuy]{0,3})/)

  if (regex) {
    find = new RegExp(regex[1], regex[2])
  }

  return out.replace(find, t.replace)
}
