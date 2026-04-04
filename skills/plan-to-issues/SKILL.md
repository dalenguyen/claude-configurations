---
name: plan-to-issues
description: Plan a feature or fix interactively, then create prioritized GitHub issues. Use when the user wants to break down work into tracked tickets.
allowed-tools: Bash(gh:*), Bash(git:*)
---

# Plan to Issues

Help the user plan a feature or fix, then create GitHub issues with priority labels.

## Process

### Step 1 — Understand the request

Read what the user passed as arguments. If they described a feature/fix, use that as the starting point.

Ask **up to 3 concise clarification questions** to fill in gaps. Cover:
- **Scope**: What exactly should change? What's out of scope?
- **Why**: What problem does this solve? Any constraints?
- **Breakdown**: Should this be one issue or multiple? (e.g. backend + frontend + tests)

Keep questions short. If the request is already clear enough, skip straight to Step 2.

### Step 2 — Draft the plan

Present a structured plan:
```
## Plan: <title>

**Goal**: <one sentence>

**Issues:**
1. [P1] <issue title> — <2-sentence description>
2. [P2] <issue title> — <2-sentence description>
...

**Out of scope**: <what we're NOT doing>

**Open questions**: <any unresolved items, if any>
```

Ask: "Does this look right, or any changes before I create the tickets?"

### Step 3 — Create GitHub issues

After user confirms, create each issue using `gh issue create`.

**Priority labels** (create if missing):
- `P1` — Critical / blocking
- `P2` — High priority
- `P3` — Normal
- `P4` — Low / nice-to-have

For each issue, use this body template:
```markdown
## Goal
<one sentence>

## Details
<2-4 bullet points of what needs to be done>

## Acceptance Criteria
- [ ] <testable outcome 1>
- [ ] <testable outcome 2>
```

Create labels if they don't exist:
```bash
gh label create "P1" --color "D93F0B" --description "Critical / blocking" 2>/dev/null || true
gh label create "P2" --color "E4E669" --description "High priority" 2>/dev/null || true
gh label create "P3" --color "0075CA" --description "Normal priority" 2>/dev/null || true
gh label create "P4" --color "CFD3D7" --description "Low / nice-to-have" 2>/dev/null || true
```

After creating all issues, list them with URLs so the user can open them directly.

## Tone
- Concise — no filler
- Ask one round of questions max, then move forward
- Default to splitting into small focused issues over one large one
