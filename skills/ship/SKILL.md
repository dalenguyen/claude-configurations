---
name: ship
description: Full GitHub ship workflow — create issue, push branch, open PR, review, wait for CI, merge, then deploy locally. Use when the user wants to ship the current changes end-to-end.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npx:*)
---

# Ship

Run the full end-to-end ship workflow for the current changes.

## Steps

### 1. Understand current state
- Run `git status` and `git diff` to see what's changed
- Run `git log --oneline -5` to understand recent history
- If no staged/unstaged changes, ask the user what they want to ship

### 2. Create a GitHub issue
- Summarize the changes in 1-2 sentences as the issue title
- Use `gh issue create --title "..." --body "..."`
- Body should describe: what, why, and acceptance criteria
- Save the issue number for later

### 3. Create a branch and commit
- Branch name: `feat/<issue-number>-<short-desc>` (or `fix/` for bug fixes)
- `git checkout -b <branch>`
- Stage relevant files (never use `git add -A` blindly — review what's being staged)
- Commit with conventional commit format: `feat(scope): description`
- Append `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` to commit

### 4. Push the branch
- `git push -u origin <branch>`

### 5. Open a Pull Request
- `gh pr create --title "..." --body "$(cat <<'EOF' ... EOF)"`
- PR body format:
  ```
  ## Summary
  - <bullet points of changes>

  Closes #<issue-number>

  ## Test plan
  - [ ] All tests pass
  - [ ] <any manual verification steps>

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```

### 6. Self-review the PR
- Run `gh pr diff` to review the full diff
- Check for: obvious bugs, missing tests, security issues, style inconsistencies
- If issues found: fix them, commit, push — the PR updates automatically
- Post a review summary comment: `gh pr review --comment -b "..."`


### 7. Merge
- Once CI passes and the self-review is clean:
- `gh pr merge --squash --delete-branch`
- Confirm the merge was successful

### 8. Deploy from local
- Pull latest main: `git checkout main && git pull`
- Determine which app(s) were changed (from the PR diff)
- Run: `pnpm nx deploy <app-name>` for each affected app (e.g. `pnpm nx deploy bot`, `pnpm nx deploy dashboard`)
- If the project has no `deploy` target, check CLAUDE.md or ask the user
- Confirm the deploy completed

### 9. Report
- Output a concise summary: issue URL, PR URL, merge commit, deploy status
- Send a Discord report if configured (chat_id `1484738057507966976`)
