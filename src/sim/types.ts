export type CommitId = string

export interface Commit {
  id: CommitId
  parents: CommitId[]
  message: string
  author: string
  time: number
  /** global creation order, used for x-axis */
  order: number
  /** lane index, used for y-axis */
  lane: number
}

export type HeadRef =
  | { type: "branch"; name: string }
  | { type: "detached"; commit: CommitId }

export interface RepoState {
  commits: Record<CommitId, Commit>
  branches: Record<string, CommitId>
  branchLanes: Record<string, number>
  head: HeadRef
  tags: Record<string, CommitId>
  nextLane: number
  counter: number
  /** true when there are staged changes ready to commit */
  staged: boolean
  /** stack of stashed states (most recent last) */
  stash?: RepoState[]
  /** simulated remote tracking refs, e.g. origin/main -> commit id */
  remote?: Record<string, CommitId>
}

export interface CommandResult {
  state: RepoState
  output: string
  ok: boolean
  changed: boolean
}

export interface ParsedCommand {
  raw: string
  program: string
  sub?: string
  args: string[]
  flags: string[]
  message?: string
}