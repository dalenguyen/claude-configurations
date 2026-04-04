---
name: work-issue
description: Pick the highest-priority open GitHub issue, implement it TDD-style, create a PR, add UI snapshots if needed, then self-review and comment on the PR.
---

# Work Issue

Pick and implement the highest-priority open GitHub issue using TDD, then create a reviewed PR.

## Process

### Step 1 — Pick the issue

If no issue number was passed as an argument, find the highest-priority open issue:

```bash
# List open issues sorted by priority label (P1 first, then P2, P3, P4, unlabeled last)
gh issue list --state open --json number,title,labels,assignees \
  --jq 'sort_by(.labels | map(.name) | if contains(["P1"]) then 0 elif contains(["P2"]) then 1 elif contains(["P3"]) then 2 elif contains(["P4"]) then 3 else 4 end) | .[0]'
```

Show the user which issue was selected:
```
Working on #<n>: <title> [<label>]
```

If an issue number was passed as argument, use that one directly.

### Step 2 — Understand the issue

Read the full issue body:
```bash
gh issue view <number>
```

Identify:
- What needs to be built/fixed
- Whether it's a UI task (Angular/HTML/CSS changes) or backend/logic task
- Acceptance criteria (from issue body or inferred)

Briefly summarize what you'll do before starting.

### Step 3 — Create a feature branch

```bash
git checkout -b issue-<number>-<short-slug>
```

### Step 4 — TDD implementation

**For every change, write the failing test first, then implement.**

**Python (pytest):**
1. Write failing test in the appropriate `tests/` directory
2. Run: `pnpm nx run <project>:test` — confirm it fails
3. Implement the feature/fix
4. Run tests again — confirm they pass

**TypeScript/Angular (vitest):**
1. Write failing spec in `*.spec.ts`
2. Run: `pnpm nx run dashboard:test` — confirm it fails
3. Implement
4. Run tests again — confirm they pass

Always run the full test suite before moving on:
```bash
pnpm nx run-many --target=test --all
```

### Step 5 — UI snapshots (if UI task)

If the issue involves visible UI changes (new component, layout change, new page):

Use Chrome DevTools MCP to capture before/after screenshots:
1. Navigate to the relevant page on localhost or prod
2. Take a screenshot and save to `/tmp/snapshot-<issue>-<description>.png`
3. Attach screenshots to the PR

### Step 6 — Create the PR

```bash
git push -u origin issue-<number>-<short-slug>
gh pr create \
  --title "<concise title>" \
  --body "$(cat <<'EOF'
## Summary
- <bullet 1>
- <bullet 2>

## Test plan
- [ ] <test scenario 1>
- [ ] <test scenario 2>

## Screenshots
<attach if UI task>

Closes #<issue-number>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Step 7 — Self-review and PR comment

After creating the PR, review your own diff:
```bash
gh pr diff
```

Post a review comment summarizing:
- What was implemented and why
- Any trade-offs or decisions made
- Anything the reviewer should pay attention to
- Remaining gaps or follow-ups (if any)

```bash
gh pr comment <pr-number> --body "..."
```

## Rules

- **Never skip the failing test step** — if a test can't be written, explain why before proceeding
- **One PR per issue** — don't bundle multiple issues
- **Keep commits atomic** — one logical change per commit
- **If blocked** — comment on the issue and stop; don't guess
- **Don't close the issue** — the PR merge will do that via "Closes #n"
