// Self-check for the progress API contract the app depends on.
// Run against a live backend: node scripts/check-progress-api.mjs [baseUrl]
import assert from "node:assert/strict"

const base = (process.argv[2] ?? process.env.API_URL ?? "http://localhost:8080").replace(/\/$/, "")
const user = `probe${Date.now()}`
const scenario = "first-commit"
const repoState = JSON.stringify({ commits: {}, branches: {}, head: null, tags: {} })

async function call(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  return { status: res.status, data: text ? JSON.parse(text) : null }
}

const reg = await call("/api/auth/register", {
  method: "POST",
  body: { username: user, email: `${user}@example.com`, password: "probe-password-123" },
})
assert.equal(reg.status, 201, `register failed: ${reg.status}`)
const token = reg.data.token

const saved = await call(`/api/progress/${scenario}`, {
  method: "PUT",
  token,
  body: { steps_done: ["init"], completed: false, repo_state: repoState },
})
assert.equal(saved.status, 204, `save progress failed: ${saved.status}`)

const current = await call("/api/progress/current", {
  method: "PUT",
  token,
  body: { scenario_id: scenario },
})
assert.equal(current.status, 204, `save position failed: ${current.status}`)

const snap = await call("/api/progress", { token })
assert.equal(snap.status, 200)
const entry = snap.data.entries.find((e) => e.scenario_id === scenario)
assert.ok(entry, "progress row missing after reload")
assert.deepEqual(entry.steps_done, ["init"])
assert.equal(entry.repo_state, repoState)
assert.equal(snap.data.current_scenario_id, scenario)

console.log(`ok: progress + position persisted for ${user}`)
