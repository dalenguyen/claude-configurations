---
name: create-skill
description: Create a new Claude Code skill. Use when the user wants to add a custom slash command, create a reusable prompt, or extend Claude Code with new capabilities.
---

# Create Skill

Help the user create a new Claude Code skill (slash command).

## Skill Structure

Skills are stored in `~/.claude/skills/<skill-name>/SKILL.md` with this format:

```markdown
---
name: skill-name
description: Brief description of when to use this skill
allowed-tools: Bash(command:*), Edit, Write  # Optional: restrict tools
---

# Skill Title

Instructions for Claude when this skill is invoked.
Include:
- What the skill should do
- Step-by-step process
- Any templates or patterns to follow
- Example outputs if helpful
```

## Process

1. **Ask the user** what the skill should do:
   - What is the skill name? (lowercase, hyphenated, e.g., `my-skill`)
   - What should the skill do when invoked?
   - Should it have any tool restrictions?

2. **Create the skill** by:
   - Creating the directory: `~/.claude/skills/<skill-name>/`
   - Writing the `SKILL.md` file with proper frontmatter

3. **Confirm creation** and explain how to use it:
   - User can invoke with `/<skill-name>`
   - Skills are available globally across all projects

## Frontmatter Options

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Skill name (used as slash command) |
| `description` | Yes | When Claude should use this skill |
| `allowed-tools` | No | Restrict which tools the skill can use |

## Examples of Good Skills

- **Code generators**: Generate boilerplate code for specific frameworks
- **Workflow helpers**: Standardize git commits, PR descriptions, code reviews
- **Documentation**: Generate docs in a specific format
- **Analysis tools**: Run specific types of code analysis
- **Custom prompts**: Reusable prompts for common tasks
