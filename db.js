import fs from 'fs'
fs.mkdirSync('data', { recursive: true })
const cache = {}

export function get(name, def) {
  if (cache[name] !== undefined) return cache[name]
  try {
    cache[name] = JSON.parse(fs.readFileSync(`data/${name}.json`, 'utf8'))
  } catch {
    cache[name] = def
  }
  return cache[name]
}

export function save(name) {
  fs.writeFileSync(`data/${name}.json`, JSON.stringify(cache[name], null, 2))
}
