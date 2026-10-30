import type {
  Commit,
  CommitId,
  CommandResult,
  ParsedCommand,
  RepoState,
} from "./types"
import { helpText } from "../lib/i18n"

const AUTHOR = "you <you@pahamgit.dev>"

function randomHash(): CommitId {
  // full 28 bits of randomness: slicing Date.now() to 7 hex chars made ids collide
  // for commits created within the same ~16ms window
  return Math.random().toString(16).slice(2, 9).padEnd(7, "0")
}

export function headCommit(state: RepoState): CommitId | null {
  if (state.head.type === "branch") return state.branches[state.head.name] ?? null
  return state.head.commit
}

export function headBranchName(state: RepoState): string | null {
  return state.head.type === "branch" ? state.head.name : null
}

export function currentLane(state: RepoState): number {
  if (state.head.type === "branch") return state.branchLanes[state.head.name] ?? 0
  const c = state.commits[state.head.commit]
  return c?.lane ?? 0
}

/** All commits reachable from `id` walking parents. */
export function reachableFrom(state: RepoState, id: CommitId | null): Set<CommitId> {
  const out = new Set<CommitId>()
  if (!id) return out
  const stack: CommitId[] = [id]
  while (stack.length) {
    const cur = stack.pop()!
    if (out.has(cur)) continue
    out.add(cur)
    const c = state.commits[cur]
    if (c) for (const p of c.parents) if (!out.has(p)) stack.push(p)
  }
  return out
}

export function isAncestor(state: RepoState, a: CommitId, b: CommitId): boolean {
  return reachableFrom(state, b).has(a)
}

function clone(state: RepoState): RepoState {
  return {
    ...state,
    commits: Object.fromEntries(
      Object.entries(state.commits).map(([k, v]) => [k, { ...v }]),
    ),
    branches: { ...state.branches },
    branchLanes: { ...state.branchLanes },
    tags: { ...state.tags },
    head:
      state.head.type === "branch"
        ? { type: "branch", name: state.head.name }
        : { type: "detached", commit: state.head.commit },
    stash: state.stash ? [...state.stash] : [],
    remote: state.remote ? { ...state.remote } : {},
  }
}

function makeCommit(
  state: RepoState,
  message: string,
  parents: CommitId[],
  lane: number,
): Commit {
  const id = randomHash()
  const commit: Commit = {
    id,
    parents,
    message,
    author: AUTHOR,
    time: Date.now(),
    order: state.counter,
    lane,
  }
  state.commits[id] = commit
  state.counter += 1
  return commit
}

function moveBranchForward(state: RepoState, branch: string, id: CommitId) {
  state.branches[branch] = id
}

export function applyCommand(
  prev: RepoState,
  cmd: ParsedCommand,
): CommandResult {
  if (!cmd.program) return { state: prev, output: "", ok: true, changed: false }
  if (cmd.program === "help") return out(prev, helpLines(), true, false)
  if (cmd.program !== "git")
    return out(prev, `bash: ${cmd.program}: command not found`, false, false)

  const state = clone(prev)
  const sub = cmd.sub

  switch (sub) {
    case "init":
      return out(state, "Reinitialized existing Git repository in memory.", true, false)
    case "status":
      return out(state, statusText(state), true, false)
    case "log":
      return out(state, logText(state, cmd.flags.includes("--oneline")), true, false)
    case "branch": {
      const [name, start] = cmd.args
      if (!name) return out(state, branchListText(state), true, false)
      if (state.branches[name])
        return out(state, `fatal: a branch named '${name}' already exists.`, false, false)
      const target = start ? resolveRef(state, start) : headCommit(state)
      if (!target) return out(state, `fatal: not a valid object name: '${start}'.`, false, false)
      state.branchLanes[name] = state.nextLane++
      state.branches[name] = target
      return out(state, "", true, true)
    }
    case "checkout":
    case "switch": {
      const createFlag = sub === "checkout" ? "-b" : "-c"
      const wantsCreate = cmd.flags.includes(createFlag) || cmd.flags.includes("-B")
      const target = cmd.args[0]
      if (!target)
        return out(state, `fatal: ${sub} requires a branch or commit name`, false, false)
      if (wantsCreate) {
        if (state.branches[target])
          return out(state, `fatal: a branch named '${target}' already exists.`, false, false)
        const start = cmd.args[1] ? resolveRef(state, cmd.args[1]) : headCommit(state)
        if (!start) return out(state, `fatal: not a valid object name: '${cmd.args[1]}'.`, false, false)
        state.branchLanes[target] = state.nextLane++
        state.branches[target] = start
        state.head = { type: "branch", name: target }
        state.staged = true
        return out(state, `Switched to a new branch '${target}'`, true, true)
      }
      if (state.branches[target]) {
        state.head = { type: "branch", name: target }
        state.staged = true
        return out(state, `Switched to branch '${target}'`, true, true)
      }
      const c = resolveRef(state, target)
      if (!c) return out(state, `error: pathspec '${target}' did not match any branch/commit`, false, false)
      state.head = { type: "detached", commit: c }
      state.staged = true
      return out(state, `HEAD is now at ${c} ${state.commits[c].message}`, true, true)
    }
    case "revert": {
      const ref = cmd.args[0] ?? "HEAD"
      const target = resolveRef(state, ref)
      if (!target) return out(state, `fatal: bad revision '${ref}'`, false, false)
      const cur = headCommit(state)
      if (!cur) return out(state, "fatal: no HEAD to revert", false, false)
      const commit = makeCommit(state, `Revert "${state.commits[target].message}"`, [cur], currentLane(state))
      if (state.head.type === "branch") moveBranchForward(state, state.head.name, commit.id)
      else state.head = { type: "detached", commit: commit.id }
      state.staged = false
      return out(state, `[${state.head.type === "branch" ? state.head.name : "detached"} ${commit.id}] Revert "${state.commits[target].message}"`, true, true)
    }
    case "stash": {
      if (cmd.args[0] === "pop" || cmd.args[0] === "apply") {
        if (!state.stash?.length)
          return out(state, "No stash entries found.", false, false)
        const restored = state.stash[state.stash.length - 1]
        state.stash = state.stash.slice(0, -1)
        state.staged = true
        return out(state, `Restored ${restored.branches && restored.head.type === "branch" ? restored.head.name : "changes"} from stash.`, true, true)
      }
      if (cmd.args[0] === "list") {
        const list = state.stash ?? []
        if (!list.length) return out(state, "No stash entries found.", true, false)
        return out(state, list.map((_, i) => `stash@{${i}}: WIP on main`).join("\n"), true, false)
      }
      if (!state.staged)
        return out(state, "No local changes to save.", false, false)
      state.stash = [...(state.stash ?? []), clone(state)]
      state.staged = false
      return out(state, "Saved working directory and index state WIP on main.", true, true)
    }
    case "rebase": {
      const name = cmd.args[0]
      if (!name) return out(state, "fatal: rebase requires a branch or ref", false, false)
      const onto = resolveRef(state, name)
      if (!onto) return out(state, `fatal: invalid upstream '${name}'`, false, false)
      if (state.head.type !== "branch")
        return out(state, "fatal: cannot rebase in detached HEAD", false, false)
      const cur = state.branches[state.head.name]
      // collect commits unique to current branch (not reachable from onto)
      const ontoReach = reachableFrom(state, onto)
      const stack: CommitId[] = [cur]
      const unique: CommitId[] = []
      const seen = new Set<CommitId>()
      while (stack.length) {
        const id = stack.pop()!
        if (seen.has(id) || ontoReach.has(id)) continue
        seen.add(id)
        unique.push(id)
        const c = state.commits[id]
        if (c) for (const p of c.parents) stack.push(p)
      }
      if (!unique.length) return out(state, `Current branch ${state.head.name} is up to date.`, true, false)
      unique.sort((a, b) => state.commits[a].order - state.commits[b].order)
      // replay commits on top of onto
      let base: CommitId = onto
      for (const id of unique) {
        const src = state.commits[id]
        const nc = makeCommit(state, src.message, [base], currentLane(state))
        base = nc.id
      }
      state.branches[state.head.name] = base
      state.staged = true
      return out(state, `Successfully rebased and updated ${state.head.name} onto ${name}.`, true, true)
    }
    case "push": {
      if (state.head.type !== "branch")
        return out(state, "fatal: cannot push in detached HEAD", false, false)
      const branch = state.head.name
      const key = `origin/${branch}`
      const cur = state.branches[branch]
      if (state.remote?.[key] === cur)
        return out(state, "Everything up-to-date", true, false)
      if (!state.remote) state.remote = {}
      state.remote[key] = cur
      state.staged = true
      return out(state, `To origin\n * [new branch]      ${branch} -> ${branch}`, true, true)
    }
    case "pull": {
      if (state.head.type !== "branch")
        return out(state, "fatal: cannot pull in detached HEAD", false, false)
      const branch = state.head.name
      const key = `origin/${branch}`
      const cur = state.branches[branch]
      const remoteId = state.remote?.[key]
      if (!remoteId) return out(state, "There is no tracking information for the current branch. Push first.", false, false)
      if (remoteId === cur) return out(state, "Already up to date.", true, false)
      if (isAncestor(state, remoteId, cur)) return out(state, "Already up to date.", true, false)
      const merge = makeCommit(state, `Merge branch '${key}'`, [cur, remoteId], currentLane(state))
      moveBranchForward(state, branch, merge.id)
      state.staged = true
      return out(state, `Merge made by the 'ort' strategy.`, true, true)
    }
    case "commit": {
      const msg = cmd.message
      if (!msg) return out(state, "Aborting commit due to empty commit message.", false, false)
      const parent = headCommit(state)
      if (!parent) return out(state, "fatal: nothing to commit (no initial commit)", false, false)
      const commit = makeCommit(state, msg, [parent], currentLane(state))
      if (state.head.type === "branch") moveBranchForward(state, state.head.name, commit.id)
      else state.head = { type: "detached", commit: commit.id }
      state.staged = false
      const where = state.head.type === "branch" ? state.head.name : "detached HEAD"
      return out(state, `[${where} ${commit.id}] ${msg}`, true, true)
    }
    case "merge": {
      const name = cmd.args[0]
      if (!name) return out(state, "fatal: merge requires a branch name", false, false)
      const target = state.branches[name]
      if (!target) return out(state, `merge: ${name} - not something we can merge`, false, false)
      const cur = headCommit(state)
      if (!cur) return out(state, "fatal: no HEAD to merge into", false, false)
      if (cur === target) return out(state, "Already up to date.", true, false)
      const noFf = cmd.flags.includes("--no-ff")
      const ffOnly = cmd.flags.includes("--ff-only")
      const canFf = isAncestor(state, cur, target)
      if (canFf && !noFf) {
        if (state.head.type === "branch") moveBranchForward(state, state.head.name, target)
        else state.head = { type: "detached", commit: target }
        return out(state, `Updating ${cur}..${target}\nFast-forward`, true, true)
      }
      if (ffOnly && !canFf)
        return out(state, "fatal: Not possible to fast-forward, aborting.", false, false)
      if (isAncestor(state, target, cur)) return out(state, "Already up to date.", true, false)
      const merge = makeCommit(state, `Merge branch '${name}'`, [cur, target], currentLane(state))
      if (state.head.type === "branch") moveBranchForward(state, state.head.name, merge.id)
      else state.head = { type: "detached", commit: merge.id }
      return out(state, `Merge made by the 'ort' strategy.`, true, true)
    }
    case "reset": {
      const ref = cmd.args[0]
      const target = ref ? resolveRef(state, ref) : headCommit(state)
      if (!target) return out(state, `fatal: ambiguous argument '${ref}'`, false, false)
      if (state.head.type !== "branch")
        return out(state, "fatal: cannot reset in detached HEAD (switch to a branch first)", false, false)
      moveBranchForward(state, state.head.name, target)
      state.staged = true
      const hard = cmd.flags.includes("--hard")
      return out(state, hard ? `HEAD is now at ${target} ${state.commits[target].message}` : "", true, true)
    }
    case "tag": {
      const [name, ref] = cmd.args
      if (!name) return out(state, tagListText(state), true, false)
      if (state.tags[name]) return out(state, `fatal: tag '${name}' already exists`, false, false)
      const target = ref ? resolveRef(state, ref) : headCommit(state)
      if (!target) return out(state, `fatal: Failed to resolve '${ref}'`, false, false)
      state.tags[name] = target
      return out(state, "", true, true)
    }
    case "show": {
      const ref = cmd.args[0]
      const c = ref ? resolveRef(state, ref) : headCommit(state)
      if (!c) return out(state, "fatal: bad ref", false, false)
      return out(state, showText(state, c), true, false)
    }
    default:
      return out(state, `git: '${sub}' is not a supported command. Type 'help'.`, false, false)
  }
}

function out(
  state: RepoState,
  output: string,
  ok: boolean,
  changed: boolean,
): CommandResult {
  return { state, output, ok, changed }
}

function resolveRef(state: RepoState, ref: string): CommitId | null {
  if (state.branches[ref]) return state.branches[ref]
  if (ref === "HEAD") return headCommit(state)
  // HEAD~N: walk N parents back from HEAD
  const headBack = /^(?:HEAD|@)~(\d+)$/.exec(ref)
  if (headBack) {
    let cur = headCommit(state)
    for (let i = 0; i < Number(headBack[1]) && cur; i++) cur = state.commits[cur]?.parents[0] ?? null
    return cur
  }
  // <branch|tag>~N
  const refBack = /^(.+)~(\d+)$/.exec(ref)
  if (refBack) {
    let cur = resolveRef(state, refBack[1])
    for (let i = 0; i < Number(refBack[2]) && cur; i++) cur = state.commits[cur]?.parents[0] ?? null
    return cur
  }
  if (state.tags[ref]) return state.tags[ref]
  const exact = Object.keys(state.commits).find((id) => id === ref || id.startsWith(ref))
  return exact ?? null
}
function branchListText(state: RepoState): string {
  const cur = headBranchName(state)
  return Object.keys(state.branches)
    .map((b) => (b === cur ? `* \x1b[32m${b}\x1b[0m` : `  ${b}`))
    .join("\n")
}

function tagListText(state: RepoState): string {
  return Object.keys(state.tags).join("\n")
}

function statusText(state: RepoState): string {
  const head = headBranchName(state)
  const branchLine = head
    ? `On branch \x1b[36m${head}\x1b[0m`
    : `HEAD detached at ${state.head.type === "detached" ? state.head.commit : "?"}`
  const staged = state.staged
    ? `\nChanges to be committed:\n  \x1b[32m(new file)\x1b[0m   simulated_change.txt`
    : `\nnothing to commit, working tree clean`

  // remote tracking info
  let remoteInfo = ""
  if (head && state.remote && state.remote[`origin/${head}`]) {
    const localId = state.branches[head]
    const remoteId = state.remote[`origin/${head}`]
    const localSet = reachableFrom(state, localId)
    const remoteSet = reachableFrom(state, remoteId)
    // sets already include the starting commit, so diff size is the true count
    const ahead = [...localSet].filter((c) => !remoteSet.has(c)).length
    const behind = [...remoteSet].filter((c) => !localSet.has(c)).length
    if (ahead > 0 && behind > 0) {
      remoteInfo = `\n\x1b[33mYour branch and 'origin/${head}' have diverged,\nand have ${ahead} and ${behind} different commits each, respectively.\nRun 'git pull' to integrate the remote changes.\x1b[0m`
    } else if (ahead > 0) {
      remoteInfo = `\n\x1b[33mYour branch is ahead of 'origin/${head}' by ${ahead} commit${ahead === 1 ? "" : "s"}.\n  (use "git push" to publish your local commits)\x1b[0m`
    } else if (behind > 0) {
      remoteInfo = `\n\x1b[33mYour branch is behind 'origin/${head}' by ${behind} commit${behind === 1 ? "" : "s"}, and can be fast-forwarded.\n  (use "git pull" to update your local branch)\x1b[0m`
    }
  }
  return `${branchLine}${remoteInfo}${staged}`
}

function logText(state: RepoState, oneline: boolean): string {
  const start = headCommit(state)
  if (!start) return ""
  const list: Commit[] = []
  const seen = new Set<CommitId>()
  const stack: CommitId[] = [start]
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    const c = state.commits[id]
    if (!c) continue
    list.push(c)
    for (const p of c.parents) if (!seen.has(p)) stack.push(p)
  }
  list.sort((a, b) => b.order - a.order)
  if (oneline)
    return list.map((c) => `\x1b[33m${c.id}\x1b[0m ${c.message}`).join("\n")
  return list
    .map((c) => {
      const refs = refsFor(state, c.id)
        .map((r) => r.label)
        .join(", ")
      return `\x1b[33mcommit ${c.id}\x1b[0m${refs ? ` (${refs})` : ""}\nAuthor: ${c.author}\n\n    ${c.message}\n`
    })
    .join("\n")
}

function showText(state: RepoState, id: CommitId): string {
  const c = state.commits[id]
  if (!c) return "fatal: bad object"
  const refs = refsFor(state, id)
    .map((r) => r.label)
    .join(", ")
  return `\x1b[33mcommit ${c.id}\x1b[0m${refs ? ` (${refs})` : ""}\nAuthor: ${c.author}\nDate:   ${new Date(c.time).toISOString()}\n\n    ${c.message}\n`
}

export interface RefInfo {
  label: string
  kind: "head" | "branch" | "tag"
  color: string
}

export function refsFor(
  state: RepoState,
  id: CommitId,
): { label: string; kind: RefInfo["kind"]; color: string }[] {
  const refs: { label: string; kind: RefInfo["kind"]; color: string }[] = []
  for (const [name, cid] of Object.entries(state.branches)) {
    if (cid !== id) continue
    const isHead = state.head.type === "branch" && state.head.name === name
    refs.push({
      label: isHead ? `\x1b[36mHEAD -> \x1b[32m${name}\x1b[0m` : `\x1b[32m${name}\x1b[0m`,
      kind: isHead ? "head" : "branch",
      color: "#34d399",
    })
  }
  if (state.head.type === "detached" && state.head.commit === id) {
    refs.push({ label: `\x1b[36mHEAD (detached)\x1b[0m`, kind: "head", color: "#22d3ee" })
  }
  for (const [name, cid] of Object.entries(state.tags)) {
    if (cid === id) refs.push({ label: `tag: \x1b[33m${name}\x1b[0m`, kind: "tag", color: "#fbbf24" })
  }
  return refs
}

function helpLines(): string {
  return helpText()
}

export function initialRepo(): RepoState {
  const state: RepoState = {
    commits: {},
    branches: {},
    branchLanes: {},
    head: { type: "branch", name: "main" },
    tags: {},
    nextLane: 1,
    counter: 0,
    staged: true,
    stash: [],
    remote: {},
  }
  state.branchLanes["main"] = 0
  const c1 = makeCommit(state, "Initial commit", [], 0)
  state.branches["main"] = c1.id
  return state
}