/**
 * GraphQL schema for simple-memory
 * Replaces 7 MCP tools with 1 GraphQL endpoint
 * 
 * Each type is defined separately for readability and easy modification.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

const MemoryType = `#graphql
  """A stored memory with content, tags, and metadata"""
  type Memory {
    """Unique MD5 hash of content"""
    hash: String!

    """Full content of the memory"""
    content: String!

    """First line of content (max 80 chars) - useful for summaries"""
    title: String!

    """Preview of content (configurable length)"""
    preview(length: Int = 100): String!

    """Tags associated with this memory"""
    tags: [String!]!

    """ISO timestamp when memory was created"""
    createdAt: String!

    """BM25 relevance score (0-1), only present for search results"""
    relevance: Float
  }
`;

const MemorySummaryType = `#graphql
  """Compact memory summary for list views"""
  type MemorySummary {
    hash: String!
    title: String!
    preview: String!
    tags: [String!]!
    createdAt: String!
    relevance: Float
  }
`;

const MCPConfigPathType = `#graphql
  """MCP configuration file location"""
  type MCPConfigPath {
    """Name of the MCP client (e.g., 'VS Code', 'Claude Desktop')"""
    name: String!

    """Absolute path to the config file"""
    path: String!

    """Whether the config file exists"""
    exists: Boolean!

    """Whether simple-memory is configured in this file"""
    hasSimpleMemory: Boolean
  }
`;

const StatsType = `#graphql
  """Database statistics"""
  type Stats {
    """simple-memory-mcp version"""
    version: String!

    """Total number of stored memories"""
    totalMemories: Int!

    """Total number of relationships between memories"""
    totalRelationships: Int!

    """Database file size in bytes"""
    dbSize: Int!

    """Path to database file"""
    dbPath: String!

    """Schema version"""
    schemaVersion: Int!

    """Path to config.json file"""
    configPath: String

    """Known MCP config file locations"""
    mcpConfigPaths: [MCPConfigPath!]
  }
`;

// =============================================================================
// RESULT TYPES
// =============================================================================

const DeleteResultType = `#graphql
  """Result of a delete operation"""
  type DeleteResult {
    """Whether the operation succeeded"""
    success: Boolean!

    """Number of memories deleted"""
    deletedCount: Int!

    """Error message if operation failed"""
    error: String
  }
`;

const StoreResultType = `#graphql
  """Result of a store operation"""
  type StoreResult {
    """Whether the operation succeeded"""
    success: Boolean!

    """Hash of the stored memory"""
    hash: String

    """Error message if operation failed"""
    error: String
  }
`;

const UpdateResultType = `#graphql
  """Result of an update operation"""
  type UpdateResult {
    """Whether the operation succeeded"""
    success: Boolean!

    """New hash after update (content hash changes)"""
    newHash: String

    """Error message if operation failed"""
    error: String
  }
`;

// =============================================================================
// QUERIES
// =============================================================================

const QueryType = `#graphql
  type Query {
    """
    Search memories by content or tags.
    If no parameters provided, returns recent memories.
    """
    memories(
      """Full-text search query"""
      query: String

      """Filter by tags"""
      tags: [String!]

      """Maximum results to return (default: 10)"""
      limit: Int = 10

      """Filter to memories from last N days"""
      daysAgo: Int

      """Filter memories created on or after this date (ISO format)"""
      startDate: String

      """Filter memories created on or before this date (ISO format)"""
      endDate: String

      """Minimum relevance score (0-1)"""
      minRelevance: Float

      """Return compact summaries instead of full content"""
      summaryOnly: Boolean = false

      """Preview length when summaryOnly=true (default: 100)"""
      previewLength: Int = 100
    ): [Memory!]!

    """Get a single memory by its hash"""
    memory(hash: String!): Memory

    """Get related memories for a given hash"""
    related(
      """Hash of the memory to find relations for"""
      hash: String!

      """Maximum related memories to return"""
      limit: Int = 10
    ): [Memory!]!

    """Get database statistics"""
    stats: Stats!
  }
`;

// =============================================================================
// MUTATIONS
// =============================================================================

const MutationType = `#graphql
  type Mutation {
    """
    Store a new memory with optional tags.
    Returns the hash of the stored memory.
    """
    store(
      """Content to store"""
      content: String!

      """Tags to associate with this memory"""
      tags: [String!] = []
    ): StoreResult!

    """
    Update an existing memory by hash.
    Returns the new hash (content changes = hash changes).
    """
    update(
      """Hash of the memory to update"""
      hash: String!

      """New content"""
      content: String!

      """New tags (replaces existing if provided)"""
      tags: [String!]
    ): UpdateResult!

    """
    Delete a memory by hash or all memories with a tag.
    Exactly one of hash or tag must be provided.
    """
    delete(
      """Hash of the memory to delete"""
      hash: String

      """Delete all memories with this tag"""
      tag: String
    ): DeleteResult!
  }
`;

// =============================================================================
// COMBINED SCHEMA EXPORT
// =============================================================================

export const typeDefs = [
  MemoryType,
  MemorySummaryType,
  MCPConfigPathType,
  StatsType,
  DeleteResultType,
  StoreResultType,
  UpdateResultType,
  QueryType,
  MutationType,
].join('\n');

/**
 * Schema description for the MCP tool definition.
 * This is embedded in the tool description so LLMs know the full API.
 */
export const schemaDescription = `
Execute GraphQL queries against the memory database. This single tool replaces multiple memory tools with a unified, flexible interface.

🧠 PROACTIVE USAGE: Search memories at the START of conversations or when relevant topics arise to provide personalized, context-aware responses.

💾 AUTO-CAPTURE: Use store mutation proactively to capture important information WITHOUT waiting for explicit requests.
✓ Preferences, decisions, facts about people/projects, learnings, action items
✗ Skip: greetings, temporary info, transactional exchanges
Store SILENTLY - don't announce saves.

SCHEMA:
  Query {
    memories(query: String, tags: [String], limit: Int, summaryOnly: Boolean, previewLength: Int): [Memory!]!
    memory(hash: String!): Memory
    related(hash: String!, limit: Int): [Memory!]!
    stats: Stats!
  }
  
  Mutation {
    store(content: String!, tags: [String]): StoreResult!
    update(hash: String!, content: String!, tags: [String]): UpdateResult!
    delete(hash: String, tag: String): DeleteResult!
  }
  
  Memory { hash, content, title, preview, tags, createdAt, relevance }
  Stats { version, totalMemories, totalRelationships, dbSize, schemaVersion }

EXAMPLES:
  # Search with summaries (efficient)
  { memories(query: "typescript", summaryOnly: true) { hash title tags } }
  
  # Get full content by hash
  { memory(hash: "abc123...") { content tags } }
  
  # Store new memory
  mutation { store(content: "Remember this", tags: ["note"]) { success hash } }
  
  # Batch operations in ONE call
  {
    search: memories(query: "mcp", limit: 3) { hash title }
    recent: memories(limit: 5) { hash createdAt }
    stats { totalMemories }
  }

TIPS:
  • Use summaryOnly: true for search, then memory(hash) for full content
  • Request only fields you need (e.g., { hash title } not { hash content title tags createdAt })
  • Batch related queries to reduce round-trips
`;
