---
name: add-sheriff
description: Add Sheriff to a TypeScript project for dependency visualization and modularity enforcement. Use when the user wants to analyze module boundaries, visualize dependencies, or enforce architectural rules in a TypeScript project.
allowed-tools: Bash(command:*), Read, Edit, Write, Glob, Grep
---

# Add Sheriff to TypeScript Project

Set up Sheriff (https://sheriff.softarc.io/) in a TypeScript project to visualize dependencies and enforce module boundaries.

## What This Skill Does

This skill automates the complete Sheriff setup including:
1. Detects project setup (package manager, ESLint, project structure)
2. Installs Sheriff core and optionally ESLint plugin
3. Configures ESLint integration if present
4. Initializes `sheriff.config.ts` for module boundaries
5. **Sets up automated visualization workflow** with interactive dependency graphs
6. Adds npm scripts for one-command usage

## Dependencies Installed

- `@softarc/sheriff-core` - Core Sheriff CLI and analysis tools
- `http-server` - Simple HTTP server for serving visualizations
- `@softarc/eslint-plugin-sheriff` - ESLint integration (only if ESLint detected)

## Files Created

- `sheriff.config.ts` - Module boundaries configuration
- `generate-viz.js` - Visualization generator script
- `sheriff-graph.json` - Raw dependency data (auto-generated)
- `sheriff-visualization.html` - Interactive dependency graph (auto-generated)

## Overview

Sheriff is a tool that:
- Enforces module boundaries and dependency rules in TypeScript
- Has zero external dependencies (TypeScript is the only peer dependency)
- Provides CLI tools to visualize and analyze project dependencies
- Can integrate with ESLint for automatic rule enforcement

## Process

### 1. Detect Project Setup

First, check what package manager and build tools the project uses:
- Look for `package.json` to detect package manager (check for lock files: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`)
- Check if ESLint is already configured (look for `eslint.config.js`, `.eslintrc.json`, `.eslintrc.js`)
- Determine if it's an Nx workspace or standard TypeScript project

### 2. Install Sheriff

Install the appropriate packages based on project setup:

**With ESLint (Recommended):**
```bash
npm install -D @softarc/sheriff-core @softarc/eslint-plugin-sheriff
# or
yarn add -D @softarc/sheriff-core @softarc/eslint-plugin-sheriff
# or
pnpm add -D @softarc/sheriff-core @softarc/eslint-plugin-sheriff
```

**Without ESLint (CLI only):**
```bash
npm install -D @softarc/sheriff-core
```

### 3. Configure ESLint Integration (if ESLint exists)

**For Flat Config (eslint.config.js):**
```javascript
const sheriff = require('@softarc/eslint-plugin-sheriff');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [sheriff.configs.all],
  },
);
```

**For Legacy Config (.eslintrc.json):**
```json
{
  "files": ["*.ts"],
  "extends": ["plugin:@softarc/sheriff/legacy"]
}
```

Note: Update existing ESLint config rather than overwriting it. Add Sheriff configuration to the existing setup.

### 4. Initialize Sheriff Configuration

Run the init command to create `sheriff.config.ts`:
```bash
npx sheriff init
```

This creates a configuration file where you can:
- Define modules and their boundaries
- Set up dependency rules
- Configure tags and module organization

### 5. Set Up Automated Visualization

Create an automated workflow for generating and viewing dependency visualizations:

**5.1. Install http-server:**
```bash
npm install -D http-server
# or appropriate package manager
```

**5.2. Create visualization generator script (`generate-viz.js`):**

Create a Node.js script that reads `sheriff-graph.json` and generates an interactive HTML visualization using vis-network. The script should:
- Read the Sheriff export JSON
- Generate an HTML file with embedded visualization using vis-network library (via CDN)
- Use hierarchical layout for clear dependency flow
- Color-code nodes by type (entry point, components, services, models, config)
- Include statistics (total files, dependencies, external libraries, max depth)
- Add timestamp and refresh instructions

Use the template file at: `~/.claude/skills/add-sheriff/scripts/generate-viz.template.js` as a reference for the implementation.

**5.3. Add npm scripts to package.json:**

Automatically add these scripts to the `scripts` section:

```json
"sheriff:export": "sheriff export src/main.ts > sheriff-graph.json",
"sheriff:generate": "node generate-viz.js",
"sheriff:serve": "http-server . -p 8081 -o /sheriff-visualization.html",
"sheriff:viz": "npm run sheriff:export && npm run sheriff:generate && npm run sheriff:serve"
```

Note: Adjust the entry point (`src/main.ts`) based on the project structure detected in step 1.

**5.4. Make the script executable:**
```bash
chmod +x generate-viz.js
```

### 6. Provide Usage Instructions

After setup, inform the user about available commands:

**Generate and view interactive visualization (RECOMMENDED):**
```bash
npm run sheriff:viz
```
This single command will:
1. Export the dependency graph
2. Generate an interactive HTML visualization
3. Start a local server on port 8081
4. Automatically open it in the browser

**Individual commands (if needed):**
```bash
npm run sheriff:export    # Export dependency graph to JSON
npm run sheriff:generate  # Generate HTML from existing JSON
npm run sheriff:serve     # Start server for existing HTML
```

**Verify dependency rules:**
```bash
npx sheriff verify
```

**List all modules and their tags:**
```bash
npx sheriff list main.ts
# or specify entry point(s) based on project structure
```

The exported JSON contains:
- All reachable files in the project
- Module assignments for each file
- Associated tags
- Complete dependency graph structure

The interactive visualization provides:
- Hierarchical dependency graph with zoom and pan
- Color-coded nodes by file type
- Hover tooltips with file details
- Statistics dashboard (files, dependencies, depth)
- Navigation controls

### 7. Next Steps Guidance

Suggest to the user:
1. Run `npm run sheriff:viz` to view the interactive dependency visualization
2. Review the generated `sheriff.config.ts` to define their module structure
3. Run `npx sheriff list <entry-file>` to see current module organization
4. Configure module boundaries and dependency rules in the config
5. Run `npx sheriff verify` to check for violations
6. Re-run `npm run sheriff:viz` after code changes to see updated dependencies
7. If using ESLint, violations will appear automatically during linting

## Tips

- **Entry Points:** Sheriff commands need entry point files. Common examples:
  - `main.ts`, `index.ts`, `src/main.ts`
  - For Nx: `apps/*/src/main.ts`
  - Multiple entry points can be configured in `sheriff.config.ts`

- **Configuration:** The `sheriff.config.ts` file is where architectural rules are defined. Start simple and add rules incrementally.

- **Visualization:** While Sheriff exports to JSON, you may need external tools or custom scripts to create visual diagrams from the export. The JSON format is designed to be tool-agnostic.

- **ESLint Integration:** When integrated with ESLint, Sheriff automatically enforces rules during development, providing immediate feedback on architectural violations.

## npm Scripts Added

The skill adds these scripts to `package.json`:

```json
{
  "sheriff:export": "sheriff export <entry-point> > sheriff-graph.json",
  "sheriff:generate": "node generate-viz.js",
  "sheriff:serve": "http-server . -p 8081 -o /sheriff-visualization.html",
  "sheriff:viz": "npm run sheriff:export && npm run sheriff:generate && npm run sheriff:serve"
}
```

**Main command users will run:** `npm run sheriff:viz`

This single command:
1. Exports the dependency graph to JSON
2. Generates an interactive HTML visualization
3. Starts a local server on port 8081
4. Automatically opens it in the browser

## Output

After successful setup:
1. Confirm packages installed (`@softarc/sheriff-core`, `http-server`, and ESLint plugin if applicable)
2. Show ESLint configuration updates (if applicable)
3. Confirm `sheriff.config.ts` creation
4. Confirm `generate-viz.js` creation
5. Show the npm scripts added to `package.json`
6. Provide the main command: `npm run sheriff:viz`
7. Explain what files were created and their purpose
8. Suggest next steps for configuring module boundaries

## Visualization Template

The template file is located at `~/.claude/skills/add-sheriff/scripts/generate-viz.template.js`

This contains the reference implementation for the visualization generator. Use this template when creating the `generate-viz.js` file in the user's project.

Key features of the visualization:
- Interactive dependency graph using vis-network
- Hierarchical layout for clear flow
- Color-coded nodes by file type
- Statistics dashboard
- Hover tooltips with file details
- Navigation controls
