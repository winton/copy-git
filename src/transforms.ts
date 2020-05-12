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
  const regex = t.find.match(/\/([^/]+)\/([gimsuy]{0,6})/)

  if (regex) {
    find = new RegExp(regex[1], regex[2])
  } else {
    find = new RegExp(t.find, "g")
  }

  return out.replace(find, t.replace)
}
