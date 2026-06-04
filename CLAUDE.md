# CLAUDE.md

Guidance for Claude Code agents working in this repository.

## Git & DevOps workflow (required for every agent)

This project separates **implementation** from **delivery**. Every agent working in
this repo MUST follow this split:

- **Coding/feature agents: commit only.** Implement on a branch and commit your work.
  Do **NOT** run `git push`, `gh pr create`, or `gh pr merge` yourself — your job
  ends at the commit.
- **The `devops` agent (`.claude/agents/devops.md`) owns delivery.** It takes a
  committed branch and lands it: push → open PR → **squash-merge into `main`** →
  delete the branch.

When you finish committing, **delegate delivery to the devops agent** — do not do it
yourself:

1. Implement on a branch (worktrees under `.claude/worktrees/` are used for
   parallel work) and **commit**.
2. Invoke the devops agent with the Agent tool using `subagent_type: "devops"`,
   naming the branch to land if it isn't the current one. Example prompt: *"Use the
   devops agent to land branch `feat/x`."*

> The devops agent definition lives in `.claude/agents/` and is **tracked in git**,
> so every clone and session has it. The rest of `.claude/` (worktrees, local state)
> stays ignored.

Conventions:

- Default/base branch: **`main`**.
- Merge strategy: **squash**.
- Branch naming: `claude/<feature>`, `feat/<feature>`, or `fix/<thing>`.
- No CI is configured yet, so merges are not gated by status checks.
