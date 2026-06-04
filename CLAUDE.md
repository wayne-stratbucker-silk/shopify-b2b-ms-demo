# CLAUDE.md

Guidance for Claude Code agents working in this repository.

## Git & DevOps workflow

This repo splits responsibilities between agents:

- **Coding/feature agents** implement changes on a branch and **commit their
  work**. That is where their job ends — they do **not** push, open PRs, or merge.
- **The `devops` agent** (`.claude/agents/devops.md`) takes a committed branch and
  lands it: push → open PR → **squash-merge into `main`** → delete the branch.

When orchestrating work:

1. Implement on a branch (worktrees under `.claude/worktrees/` are used for
   parallel work) and **commit**.
2. Delegate to the `devops` agent for the PR and merge. Invoke it with the Agent
   tool using `subagent_type: "devops"`; tell it which branch to land if that
   isn't the current branch.

Conventions:

- Default/base branch: **`main`**.
- Merge strategy: **squash**.
- Branch naming: `claude/<feature>`, `feat/<feature>`, or `fix/<thing>`.
- No CI is configured yet, so merges are not gated by status checks.
