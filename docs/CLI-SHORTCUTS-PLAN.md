# CLI Shortcuts Implementation Plan

## Problem Statement

After consolidating 7 MCP tools into 1 GraphQL tool, the CLI loses its self-documenting nature:

```bash
# Old - clear, discoverable via --help
node dist/index.js search-memory --query "test" --tags "tag1" --limit 5

# New - requires knowing GraphQL syntax
node dist/index.js memory-graphql --query '{ memories(query: "test") { hash } }'
```

The GraphQL interface is powerful but not human-friendly for CLI usage.

---

## Solution: CLI Shortcuts Layer

Keep human-friendly CLI commands that internally generate GraphQL queries.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Input                            │
│  node dist/index.js search --query "test" --limit 5         │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    cli-shortcuts.ts                          │
│  Maps CLI args → GraphQL query                               │
│  { memories(query: "test", limit: 5) { hash title ... } }   │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    GraphQL Executor                          │
│  Same path as memory-graphql tool                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Phase 1: CLI Command Config

**File:** `src/cli/shortcuts-config.ts`

```typescript
interface CliCommand {
  name: string;
  description: string;
  operation: string;           // GraphQL operation name
  type: 'query' | 'mutation';
  defaultFields: string[];     // Fields to include in response
  args: CliArg[];
}

interface CliArg {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

export const CLI_COMMANDS: CliCommand[] = [
  {
    name: 'search',
    description: 'Search memories by content or tags',
    operation: 'memories',
    type: 'query',
    defaultFields: ['hash', 'title', 'tags', 'content', 'createdAt'],
    args: [
      { name: 'query', type: 'string', description: 'Full-text search query' },
      { name: 'tags', type: 'array', description: 'Filter by tags' },
      { name: 'limit', type: 'number', description: 'Max results', default: 10 },
      { name: 'daysAgo', type: 'number', description: 'Filter to last N days' },
      { name: 'summary', type: 'boolean', description: 'Return summaries only' },
    ]
  },
  {
    name: 'get',
    description: 'Get a single memory by hash',
    operation: 'memory',
    type: 'query',
    defaultFields: ['hash', 'content', 'tags', 'createdAt'],
    args: [
      { name: 'hash', type: 'string', description: 'Memory hash', required: true },
    ]
  },
  {
    name: 'related',
    description: 'Find related memories',
    operation: 'related',
    type: 'query',
    defaultFields: ['hash', 'title', 'tags'],
    args: [
      { name: 'hash', type: 'string', description: 'Memory hash', required: true },
      { name: 'limit', type: 'number', description: 'Max results', default: 10 },
    ]
  },
  {
    name: 'stats',
    description: 'Show database statistics',
    operation: 'stats',
    type: 'query',
    defaultFields: ['version', 'totalMemories', 'totalRelationships', 'dbSize'],
    args: []
  },
  {
    name: 'store',
    description: 'Store a new memory',
    operation: 'store',
    type: 'mutation',
    defaultFields: ['success', 'hash'],
    args: [
      { name: 'content', type: 'string', description: 'Content to store', required: true },
      { name: 'tags', type: 'array', description: 'Tags to associate' },
    ]
  },
  {
    name: 'update',
    description: 'Update an existing memory',
    operation: 'update',
    type: 'mutation',
    defaultFields: ['success', 'newHash'],
    args: [
      { name: 'hash', type: 'string', description: 'Memory hash', required: true },
      { name: 'content', type: 'string', description: 'New content', required: true },
      { name: 'tags', type: 'array', description: 'New tags (replaces existing)' },
    ]
  },
  {
    name: 'delete',
    description: 'Delete a memory',
    operation: 'delete',
    type: 'mutation',
    defaultFields: ['success', 'deletedCount'],
    args: [
      { name: 'hash', type: 'string', description: 'Memory hash to delete' },
      { name: 'tag', type: 'string', description: 'Delete all with this tag' },
    ]
  },
];
```

---

### Phase 2: Query Builder

**File:** `src/cli/query-builder.ts`

```typescript
import { CLI_COMMANDS, CliCommand } from './shortcuts-config.js';

export function buildGraphQLQuery(
  commandName: string, 
  args: Record<string, any>
): string {
  const cmd = CLI_COMMANDS.find(c => c.name === commandName);
  if (!cmd) throw new Error(`Unknown command: ${commandName}`);

  const gqlArgs = buildArgs(cmd, args);
  const fields = cmd.defaultFields.join(' ');

  if (cmd.type === 'mutation') {
    return `mutation { ${cmd.operation}(${gqlArgs}) { ${fields} } }`;
  }
  return `{ ${cmd.operation}(${gqlArgs}) { ${fields} } }`;
}

function buildArgs(cmd: CliCommand, args: Record<string, any>): string {
  const parts: string[] = [];
  
  for (const arg of cmd.args) {
    const value = args[arg.name] ?? arg.default;
    if (value === undefined) continue;

    if (arg.type === 'string') {
      parts.push(`${arg.name}: "${escapeString(value)}"`);
    } else if (arg.type === 'array') {
      const arr = Array.isArray(value) ? value : value.split(',');
      parts.push(`${arg.name}: [${arr.map(v => `"${v}"`).join(', ')}]`);
    } else if (arg.type === 'boolean') {
      parts.push(`${arg.name}: ${value}`);
    } else {
      parts.push(`${arg.name}: ${value}`);
    }
  }

  return parts.join(', ');
}

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}
```

---

### Phase 3: Help Generator

**File:** `src/cli/help-generator.ts`

```typescript
import { CLI_COMMANDS } from './shortcuts-config.js';

export function generateHelp(commandName?: string): string {
  if (commandName) {
    return generateCommandHelp(commandName);
  }
  return generateMainHelp();
}

function generateMainHelp(): string {
  const lines = [
    'simple-memory - Persistent memory storage for LLMs',
    '',
    'Usage: simple-memory <command> [options]',
    '',
    'Commands:',
  ];

  for (const cmd of CLI_COMMANDS) {
    lines.push(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
  }

  lines.push('');
  lines.push('  graphql      Execute raw GraphQL query');
  lines.push('');
  lines.push('Run "simple-memory <command> --help" for command-specific options.');

  return lines.join('\n');
}

function generateCommandHelp(commandName: string): string {
  const cmd = CLI_COMMANDS.find(c => c.name === commandName);
  if (!cmd) return `Unknown command: ${commandName}`;

  const lines = [
    `simple-memory ${cmd.name} - ${cmd.description}`,
    '',
    'Options:',
  ];

  for (const arg of cmd.args) {
    const req = arg.required ? ' (required)' : '';
    const def = arg.default !== undefined ? ` [default: ${arg.default}]` : '';
    lines.push(`  --${arg.name.padEnd(12)} ${arg.description}${req}${def}`);
  }

  lines.push('');
  lines.push('Example:');
  lines.push(`  simple-memory ${cmd.name} ${generateExample(cmd)}`);

  return lines.join('\n');
}

function generateExample(cmd: CliCommand): string {
  const parts: string[] = [];
  for (const arg of cmd.args) {
    if (arg.required || arg.name === 'query') {
      if (arg.type === 'string') parts.push(`--${arg.name} "example"`);
      else if (arg.type === 'number') parts.push(`--${arg.name} 5`);
      else if (arg.type === 'array') parts.push(`--${arg.name} "tag1,tag2"`);
    }
  }
  return parts.join(' ');
}
```

---

### Phase 4: CLI Entry Point

**File:** `src/cli/index.ts`

```typescript
import { CLI_COMMANDS } from './shortcuts-config.js';
import { buildGraphQLQuery } from './query-builder.js';
import { generateHelp } from './help-generator.js';
import { executeGraphQL } from '../graphql/executor.js';
import { parseArgs } from './arg-parser.js';

export async function runCli(argv: string[]): Promise<void> {
  const [command, ...rest] = argv;

  // Help
  if (!command || command === '--help' || command === '-h') {
    console.log(generateHelp());
    return;
  }

  // Raw GraphQL
  if (command === 'graphql') {
    const args = parseArgs(rest);
    const result = await executeGraphQL(args.query, args.variables);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  // Shortcut command
  const cmd = CLI_COMMANDS.find(c => c.name === command);
  if (!cmd) {
    console.error(`Unknown command: ${command}`);
    console.log(generateHelp());
    process.exit(1);
  }

  // Command-specific help
  const args = parseArgs(rest);
  if (args.help) {
    console.log(generateHelp(command));
    return;
  }

  // Build and execute GraphQL
  const query = buildGraphQLQuery(command, args);
  const result = await executeGraphQL(query);
  console.log(JSON.stringify(result, null, 2));
}
```

---

## File Structure

```
src/cli/
├── index.ts              # Entry point, routing
├── shortcuts-config.ts   # Command definitions (THE CONTRACT)
├── query-builder.ts      # Args → GraphQL string
├── arg-parser.ts         # Parse CLI arguments
└── help-generator.ts     # Generate --help output
```

---

## Usage Examples

After implementation:

```bash
# Human-friendly shortcuts
simple-memory search --query "typescript" --limit 5
simple-memory store --content "Remember this" --tags "note,important"
simple-memory stats
simple-memory get --hash "abc123"
simple-memory delete --tag "temp"

# Power user: raw GraphQL
simple-memory graphql --query '{ 
  search: memories(query: "mcp") { hash title }
  stats { totalMemories }
}'

# Help
simple-memory --help
simple-memory search --help
```

---

## Adding New Commands

When adding a new operation:

1. **schema.ts** - Add GraphQL type/field
2. **resolvers.ts** - Add resolver function
3. **shortcuts-config.ts** - Add CLI command definition

```typescript
// Example: Adding 'export' command
{
  name: 'export',
  description: 'Export memories to JSON file',
  operation: 'export',
  type: 'query',  // or mutation
  defaultFields: ['success', 'outputPath', 'totalMemories'],
  args: [
    { name: 'output', type: 'string', description: 'Output file path', required: true },
    { name: 'tags', type: 'array', description: 'Filter by tags' },
  ]
}
```

Help and arg parsing auto-generate from config.

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Discoverability | `--help` per tool | `--help` from config |
| Adding commands | New folder + 3 files | 1 config entry |
| Consistency | Manual enforcement | Generated from config |
| Power users | Limited | Raw GraphQL available |
| Maintenance | 7 × 3 = 21 files | 5 files total |

---

## Migration Path

1. Implement CLI shortcuts layer
2. Keep legacy tools temporarily (deprecation warning)
3. Update README with new CLI syntax
4. Remove legacy tools after validation

---

*Created: 2025-11-28*
