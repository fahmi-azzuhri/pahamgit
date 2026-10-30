import { readFileSync } from "fs"
const lock = JSON.parse(readFileSync(process.argv[2], "utf8"))
const bad = Object.entries(lock.packages)
  .filter(([k, v]) => k.startsWith("node_modules/") && Object.keys(v).length > 0 && !v.version)
  .map(([k]) => k)
console.log(bad.length ? bad.join("\n") : "all lockfile packages have versions")

