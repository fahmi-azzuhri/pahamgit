import type { ParsedCommand } from "./types"

const GIT_SUBCOMMANDS = [
  "init",
  "status",
  "log",
  "branch",
  "checkout",
  "switch",
  "commit",
  "merge",
  "rebase",
  "reset",
  "tag",
  "stash",
  "show",
  "diff",
]

/** Split a command line into tokens, respecting single/double quotes. */
function tokenize(input: string): string[] {
  const tokens: string[] = []
  let cur = ""
  let quote: string | null = null
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quote) {
      if (ch === quote) {
        quote = null
      } else {
        cur += ch
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === " " || ch === "\t") {
      if (cur) {
        tokens.push(cur)
        cur = ""
      }
      continue
    }
    cur += ch
  }
  if (cur) tokens.push(cur)
  return tokens
}

export function parseCommand(input: string): ParsedCommand {
  const raw = input
  const tokens = tokenize(input.trim())
  const result: ParsedCommand = {
    raw,
    program: tokens[0] ?? "",
    args: [],
    flags: [],
  }
  if (!result.program) return result

  if (result.program === "git") {
    result.sub = tokens[1]
    const rest = tokens.slice(2)
    for (let i = 0; i < rest.length; i++) {
      const t = rest[i]
      if (t === "-m" || t === "--message") {
        result.message = rest[i + 1] ?? ""
        i++
      } else if (t.startsWith("-m")) {
        result.message = t.slice(2)
      } else if (t.startsWith("--message=")) {
        result.message = t.slice("--message=".length)
      } else if (t.startsWith("-")) {
        result.flags.push(t)
      } else {
        result.args.push(t)
      }
    }
  } else {
    result.args = tokens.slice(1)
    for (let i = 0; i < result.args.length; i++) {
      const t = result.args[i]
      if (t.startsWith("-")) {
        result.flags.push(t)
        result.args.splice(i, 1)
        i--
      }
    }
  }
  return result
}

/** Tab-completion candidates for a partial input. */
export function complete(input: string, branchNames: string[]): string | null {
  const tokens = tokenize(input)
  const last = tokens[tokens.length - 1] ?? ""
  const startsNewWord = input.endsWith(" ") || tokens.length === 0

  // completing the subcommand of `git `
  if (tokens[0] === "git" && (tokens.length === 1 || (tokens.length === 2 && !startsNewWord))) {
    const matches = GIT_SUBCOMMANDS.filter((s) => s.startsWith(last))
    if (matches.length === 1) return matches[0]
    return null
  }
  // completing branch names for branch/checkout/switch/merge
  if (tokens[0] === "git" && ["branch", "checkout", "switch", "merge"].includes(tokens[1] ?? "")) {
    const matches = branchNames.filter((b) => b.startsWith(last))
    if (matches.length === 1) return matches[0]
  }
  return null
}

export const HELP_TEXT = `Supported commands:
  git status                      show repo state
  git log [--oneline]            show commit history
  git branch [name] [start]       list / create branches
  git checkout [-b] <branch|id>  switch or create+switch
  git switch [-c] <branch>        switch or create+switch
  git commit -m "msg"             record a new commit
  git merge <branch> [--no-ff]   merge a branch
  git reset [--hard] [id]         move current branch back
  git tag <name> [id]             create a tag
  clear                           clear the terminal
  help                            show this help`