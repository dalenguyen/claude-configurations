---
name: review-pr
description: Review a GitHub Pull Request with best practices, then clean up the cloned repository
allowed-tools: Bash(command:*), Read, Glob, Grep, Write
---

# PR Review Skill

Review a Pull Request with comprehensive best practices analysis.

## Workflow

### 1. Get PR Information
- Ask the user for the PR URL or GitHub PR reference (e.g., `owner/repo#123`)
- Parse the repository URL and PR number

### 2. Clone and Checkout PR
```bash
# Create a temporary directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone the repository
git clone <repo-url> repo
cd repo

# Fetch and checkout the PR
gh pr checkout <PR-number>
# OR
git fetch origin pull/<PR-number>/head:pr-<PR-number>
git checkout pr-<PR-number>
```

### 3. Analyze PR Changes
Use `gh pr diff` or `git diff` to get the changes:
```bash
gh pr view <PR-number> --json title,body,author,additions,deletions,files
gh pr diff <PR-number>
```

### 4. Review Checklist

Analyze the PR for:

#### Code Quality
- [ ] Code follows project conventions and style guides
- [ ] No code duplication or redundant logic
- [ ] Functions/methods are focused and single-purpose
- [ ] Naming is clear and descriptive
- [ ] No overly complex logic without justification

#### Security
- [ ] No hardcoded secrets, API keys, or sensitive data
- [ ] Proper input validation and sanitization
- [ ] No SQL injection, XSS, or other OWASP Top 10 vulnerabilities
- [ ] Authentication and authorization properly implemented
- [ ] Dependencies are up-to-date and secure

#### Testing
- [ ] Tests are included for new functionality
- [ ] Tests cover edge cases and error scenarios
- [ ] Existing tests still pass
- [ ] Test coverage is maintained or improved

#### Documentation
- [ ] Code comments explain "why", not just "what"
- [ ] Public APIs are documented
- [ ] README or docs updated if needed
- [ ] Breaking changes are clearly documented

#### Performance
- [ ] No obvious performance bottlenecks
- [ ] Efficient algorithms and data structures
- [ ] Database queries are optimized
- [ ] No unnecessary network calls or loops

#### Architecture
- [ ] Changes align with existing architecture
- [ ] No tight coupling introduced
- [ ] Proper error handling
- [ ] Logging is appropriate

#### Git Hygiene
- [ ] Commit messages are clear and descriptive
- [ ] No commits with "WIP" or "fix" without context
- [ ] No merge commits (if squash/rebase policy exists)
- [ ] Branch is up-to-date with base branch

### 5. Generate Review Document

Create a markdown file with:
- PR summary (title, author, stats)
- Key changes overview
- Findings organized by category (Critical, Major, Minor, Suggestions)
- Specific file:line references for issues
- Positive observations (what was done well)
- Overall recommendation (Approve, Request Changes, Comment)

### 6. Cleanup
```bash
# Go back to original directory
cd "$ORIGINAL_DIR"

# Remove the cloned repository
rm -rf "$TEMP_DIR"
```

### 7. Save Review Document
Save the review as `pr-<number>-review.md` in the current directory or a user-specified location.

## Output Format

```markdown
# PR Review: <PR Title>

**PR:** #<number> by @<author>
**Date:** <review-date>
**Stats:** +<additions> -<deletions> in <files> files

## Summary
<Brief overview of what the PR does>

## Key Changes
- Change 1
- Change 2
- Change 3

## Findings

### 🔴 Critical
- [File:Line] Issue description and recommendation

### 🟡 Major
- [File:Line] Issue description and recommendation

### 🔵 Minor
- [File:Line] Issue description and recommendation

### 💡 Suggestions
- Optional improvements or best practices

## Positive Observations
- What was done well
- Good practices observed

## Recommendation
**[APPROVE / REQUEST CHANGES / COMMENT]**

Overall assessment and next steps.
```

## Usage Examples

```bash
# Review a PR by URL
/review-pr https://github.com/owner/repo/pull/123

# Review a PR by reference
/review-pr owner/repo#123

# Review with custom output location
/review-pr owner/repo#123 --output ~/reviews/
```

## Notes

- Requires `gh` (GitHub CLI) to be installed and authenticated
- For private repositories, ensure proper access permissions
- Large PRs may take longer to analyze
- The temp directory is automatically cleaned up after review
