const vec3ArrayRegex = (indentCount) =>
  new RegExp(
    `\\: \\[\\n {${indentCount}}([+-]?\\d+\\.?\\d*),\\n {${indentCount}}([+-]?\\d+\\.?\\d*),\\n {${indentCount}}([+-]?\\d+\\.?\\d*)\\n {${
      indentCount - 2
    }}\\]`,
    'gm'
  )
const vec3ArrayReplacement = (_, v1, v2, v3) => `: [ ${v1}, ${v2}, ${v3} ]`

const shapeDataRegex = /^ {2}"shape": \{.*?^ {2}\}/gms
const shapeDataReplacement = `  "shape": {
    // Shape data here...
  }`

const bodyDataRegex = /^ {2}"body": \{.*?^ {2}\}/gms
const bodyDataReplacement = `  "body": {
    // Body data here...
  }`

export const prettyPrint = (data) => {
  const indentCount = 2
  return JSON.stringify(data, null, indentCount)
    .replace(vec3ArrayRegex(indentCount * 2), vec3ArrayReplacement)
    .replace(vec3ArrayRegex(indentCount * 3), vec3ArrayReplacement)
    .replace(shapeDataRegex, shapeDataReplacement)
    .replace(bodyDataRegex, bodyDataReplacement)
}
