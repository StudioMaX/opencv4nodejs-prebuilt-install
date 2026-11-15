const defaults = require("./defaults");
const envName = process.argv[2]

if (!envName) {
  throw new Error('no env name passed to parseEnv')
}
const fallback = defaults[envName]
const outputs = (process.env[envName] || (fallback && fallback()) || '').split(/[\n;]/)
outputs.forEach(o => console.log(o))
