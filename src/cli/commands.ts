/**
 * Declarative CLI command definitions
 * Help is auto-generated from these definitions - no duplication
 */

import { readFileSync } from 'fs';

export interface CommandOption {
  type: 'string' | 'number' | 'boolean';
  description: string;
  required?: boolean;
  default?: any;
  alias?: string;
}

export interface CommandDefinition {
  description: string;
  options: Record<string, CommandOption>;
  examples: string[];
  notes?: string[];
  // Function to build GraphQL query from parsed args (for shortcut commands)
  buildQuery?: (args: Record<string, any>) => string;
}

// Helper to escape GraphQL strings
function escapeGraphQL(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

// Helper to process tags for GraphQL
function tagsToGraphQL(tags: string): string {
  return tags.split(',').map((t: string) => `"${t.trim()}"`).join(', ');
}

// =============================================================================
// COMMAND DEFINITIONS
// =============================================================================

export const COMMANDS: Record<string, CommandDefinition> = {
  search: {
    description: 'Search memories by content or tags',
    options: {
      query: { type: 'string', description: 'Full-text search query' },
      tags: { type: 'string', description: 'Filter by tags (comma-separated)' },
      limit: { type: 'number', description: 'Max results', default: 10 },
      daysAgo: { type: 'number', description: 'Filter to last N days' },
      summary: { type: 'boolean', description: 'Return summaries only (faster)' },
      verbose: { type: 'boolean', description: 'Show generated GraphQL query' },
    },
    examples: [
      'simple-memory search --query "typescript"',
      'simple-memory search --tags "project,work" --limit 20',
      'simple-memory search --query "bug" --daysAgo 7',
      'simple-memory search --query "api" --verbose',
    ],
    buildQuery: (args) => {
      const limit = args.limit || 10;
      const parts = [`limit: ${limit}`];
      if (args.query) {
        parts.push(`query: "${escapeGraphQL(args.query)}"`);
      }
      if (args.tags) {
        parts.push(`tags: [${tagsToGraphQL(args.tags)}]`);
      }
      if (args.daysAgo) {
        parts.push(`daysAgo: ${args.daysAgo}`);
      }
      if (args.summary) {
        parts.push(`summaryOnly: true`);
      }
      
      const fields = args.summary 
        ? 'hash title preview tags createdAt'
        : 'hash title content tags createdAt';
      
      return `{ memories(${parts.join(', ')}) { ${fields} } }`;
    },
  },

  store: {
    description: 'Store a new memory',
    options: {
      content: { type: 'string', description: 'Content to store', required: true },
      tags: { type: 'string', description: 'Tags (comma-separated)' },
      verbose: { type: 'boolean', description: 'Show generated GraphQL query' },
    },
    examples: [
      'simple-memory store --content "Remember this note"',
      'simple-memory store --content "API key: xyz" --tags "credentials,api"',
    ],
    buildQuery: (args) => {
      if (!args.content) {
        throw new Error('--content is required');
      }
      const tagsArg = args.tags ? `, tags: [${tagsToGraphQL(args.tags)}]` : '';
      return `mutation { store(content: "${escapeGraphQL(args.content)}"${tagsArg}) { success hash } }`;
    },
  },

  update: {
    description: 'Update an existing memory',
    options: {
      hash: { type: 'string', description: 'Memory hash', required: true },
      content: { type: 'string', description: 'New content', required: true },
      tags: { type: 'string', description: 'New tags (replaces existing)' },
      verbose: { type: 'boolean', description: 'Show generated GraphQL query' },
    },
    examples: [
      'simple-memory update --hash "abc123" --content "Updated content"',
      'simple-memory update --hash "abc123" --content "New text" --tags "updated"',
    ],
    buildQuery: (args) => {
      if (!args.hash) {
        throw new Error('--hash is required');
      }
      if (!args.content) {
        throw new Error('--content is required');
      }
      const tagsArg = args.tags ? `, tags: [${tagsToGraphQL(args.tags)}]` : '';
      return `mutation { update(hash: "${args.hash}", content: "${escapeGraphQL(args.content)}"${tagsArg}) { success hash } }`;
    },
  },

  get: {
    description: 'Get a memory by hash',
    options: {
      hash: { type: 'string', description: 'Memory hash', required: true },
    },
    examples: [
      'simple-memory get --hash "abc123..."',
    ],
    buildQuery: (args) => {
      if (!args.hash) {
        throw new Error('--hash is required');
      }
      return `{ memory(hash: "${args.hash}") { hash content tags createdAt } }`;
    },
  },

  related: {
    description: 'Find related memories',
    options: {
      hash: { type: 'string', description: 'Memory hash', required: true },
      limit: { type: 'number', description: 'Max results', default: 10 },
    },
    examples: [
      'simple-memory related --hash "abc123..."',
      'simple-memory related --hash "abc123" --limit 5',
    ],
    buildQuery: (args) => {
      if (!args.hash) {
        throw new Error('--hash is required');
      }
      const limit = args.limit || 10;
      return `{ related(hash: "${args.hash}", limit: ${limit}) { hash title tags } }`;
    },
  },

  delete: {
    description: 'Delete a memory',
    options: {
      hash: { type: 'string', description: 'Delete specific memory by hash' },
      tag: { type: 'string', description: 'Delete all memories with this tag' },
    },
    examples: [
      'simple-memory delete --hash "abc123..."',
      'simple-memory delete --tag "temporary"',
    ],
    notes: ['Provide either --hash OR --tag, not both'],
    buildQuery: (args) => {
      if (args.hash) {
        return `mutation { delete(hash: "${args.hash}") { success hash } }`;
      } else if (args.tag) {
        return `mutation { delete(tag: "${args.tag}") { success deletedCount } }`;
      }
      throw new Error('Either --hash or --tag is required');
    },
  },

  stats: {
    description: 'Show database statistics',
    options: {},
    examples: [
      'simple-memory stats',
    ],
    buildQuery: () => {
      return `{ stats { version totalMemories totalRelationships dbSize dbPath schemaVersion configPath backupEnabled backupPath backupCount lastBackupAge nextBackupIn mcpConfigPaths { name path exists } } }`;
    },
  },

  graphql: {
    description: 'Execute raw GraphQL query',
    options: {
      query: { type: 'string', description: 'GraphQL query or mutation', required: true },
    },
    examples: [
      "simple-memory graphql --query '{ stats { totalMemories } }'",
      "simple-memory graphql --query '{ memories(limit: 5) { hash title tags } }'",
      "simple-memory graphql --query 'mutation { store(content: \"text\") { hash } }'",
    ],
  },

  config: {
    description: 'Show or initialize configuration',
    options: {
      init: { type: 'boolean', description: 'Create default config.json with examples' },
      show: { type: 'boolean', description: 'Show current config (default)' },
      path: { type: 'boolean', description: 'Show path to config file only' },
    },
    examples: [
      'simple-memory config',
      'simple-memory config --init',
      'simple-memory config --path',
    ],
    notes: [
      'Location: ~/.simple-memory/config.json',
      'Settings in config.json apply to ALL clients (CLI, MCP, etc.)',
      'Environment variables can override for specific contexts.',
    ],
  },

  'export-memory': {
    description: 'Export memories to JSON file',
    options: {
      output: { type: 'string', description: 'Output file path', alias: 'o' },
      tags: { type: 'string', description: 'Filter by tags (comma-separated)' },
      hashes: { type: 'string', description: 'Export specific memories by hash (comma-separated)' },
      query: { type: 'string', description: 'Filter by search query' },
    },
    examples: [
      'simple-memory export-memory --output backup.json',
      'simple-memory export-memory --output work.json --tags "work,project"',
      'simple-memory export-memory --output single.json --hashes "abc123,def456"',
    ],
  },

  'import-memory': {
    description: 'Import memories from JSON file',
    options: {
      input: { type: 'string', description: 'Input file path', required: true, alias: 'i' },
      merge: { type: 'boolean', description: 'Merge with existing (skip duplicates)', default: true },
    },
    examples: [
      'simple-memory import-memory --input backup.json',
      'simple-memory import-memory --input backup.json --merge',
    ],
  },

  'check-integrity': {
    description: 'Check database integrity',
    options: {},
    examples: [
      'simple-memory check-integrity',
    ],
  },

  'rebuild-index': {
    description: 'Rebuild hash index',
    options: {},
    examples: [
      'simple-memory rebuild-index',
    ],
  },

  setup: {
    description: 'Auto-configure VS Code and Claude Desktop',
    options: {},
    examples: [
      'simple-memory setup',
    ],
  },
};

// =============================================================================
// VERSION
// =============================================================================

export function getVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

// =============================================================================
// HELP GENERATORS
// =============================================================================

export function generateCommandHelp(command: string): string {
  const def = COMMANDS[command];
  if (!def) {
    return `No help available for: ${command}`;
  }

  const lines: string[] = [
    '',
    `simple-memory ${command} - ${def.description}`,
    '',
  ];

  // Options
  const optionKeys = Object.keys(def.options);
  if (optionKeys.length > 0) {
    lines.push('OPTIONS:');
    for (const [name, opt] of Object.entries(def.options)) {
      const reqStr = opt.required ? ' (required)' : '';
      const defStr = opt.default !== undefined ? ` [default: ${opt.default}]` : '';
      const typeHint = opt.type === 'boolean' ? '' : ` <${opt.type === 'number' ? 'n' : name}>`;
      lines.push(`  --${name}${typeHint}${' '.repeat(Math.max(1, 16 - name.length - typeHint.length))}${opt.description}${reqStr}${defStr}`);
    }
    lines.push('');
  }

  // Notes
  if (def.notes && def.notes.length > 0) {
    lines.push('NOTES:');
    for (const note of def.notes) {
      lines.push(`  ${note}`);
    }
    lines.push('');
  }

  // Examples
  if (def.examples.length > 0) {
    lines.push('EXAMPLES:');
    for (const ex of def.examples) {
      lines.push(`  ${ex}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export function generateMainHelp(): string {
  // Group commands by category
  const shortcuts = ['search', 'store', 'update', 'get', 'related', 'delete', 'stats'];
  const config = ['config', 'setup'];
  const advanced = ['graphql', 'export-memory', 'import-memory', 'check-integrity', 'rebuild-index'];

  // Find max command length for consistent padding
  const allCmds = [...shortcuts, ...config, ...advanced];
  const maxLen = Math.max(...allCmds.map(c => c.length)) + 2;

  const lines: string[] = [
    '',
    `simple-memory v${getVersion()} - Persistent memory storage for LLMs`,
    '',
    'USAGE:',
    '  simple-memory <command> [options]',
    '',
    'QUICK COMMANDS:',
  ];

  for (const cmd of shortcuts) {
    const def = COMMANDS[cmd];
    lines.push(`  ${cmd.padEnd(maxLen)}${def.description}`);
  }

  lines.push('', 'CONFIGURATION:');
  for (const cmd of config) {
    const def = COMMANDS[cmd];
    lines.push(`  ${cmd.padEnd(maxLen)}${def.description}`);
  }

  lines.push('', 'ADVANCED:');
  for (const cmd of advanced) {
    const def = COMMANDS[cmd];
    lines.push(`  ${cmd.padEnd(maxLen)}${def.description}`);
  }

  lines.push(
    '',
    'Run "simple-memory <command> --help" for command-specific options.',
    '',
    'EXAMPLES:',
    '  simple-memory search --query "typescript" --limit 5',
    '  simple-memory store --content "Remember this" --tags "note,important"',
    '  simple-memory stats',
    '  simple-memory get --hash "abc123..."',
    '  simple-memory delete --tag "temporary"',
    '',
  );

  return lines.join('\n');
}

// =============================================================================
// COMMAND EXECUTION HELPERS
// =============================================================================

export function isGraphQLShortcut(command: string): boolean {
  return command in COMMANDS && COMMANDS[command].buildQuery !== undefined;
}

export function buildGraphQLQuery(command: string, args: Record<string, any>): string {
  const def = COMMANDS[command];
  if (!def?.buildQuery) {
    throw new Error(`Command ${command} is not a GraphQL shortcut`);
  }
  return def.buildQuery(args);
}
