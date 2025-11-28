/**
 * GraphQL schema for simple-memory
 * Replaces 7 MCP tools with 1 GraphQL endpoint
 */

export const typeDefs = `#graphql
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

  """Compact memory summary for list views"""
  type MemorySummary {
    hash: String!
    title: String!
    preview: String!
    tags: [String!]!
    createdAt: String!
    relevance: Float
  }

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
  }

  """Result of a delete operation"""
  type DeleteResult {
    """Whether the operation succeeded"""
    success: Boolean!
    """Number of memories deleted"""
    deletedCount: Int!
    """Error message if operation failed"""
    error: String
  }

  """Result of a store operation"""
  type StoreResult {
    """Whether the operation succeeded"""
    success: Boolean!
    """Hash of the stored memory"""
    hash: String
    """Error message if operation failed"""
    error: String
  }

  """Result of an update operation"""
  type UpdateResult {
    """Whether the operation succeeded"""
    success: Boolean!
    """New hash after update (content hash changes)"""
    newHash: String
    """Error message if operation failed"""
    error: String
  }

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

/**
 * Schema description for the MCP tool definition.
 * This is embedded in the tool description so LLMs know the full API.
 */
export const schemaDescription = `
Execute GraphQL queries against the memory database.

SCHEMA:
  type Query {
    memories(query: String, tags: [String], limit: Int, summaryOnly: Boolean): [Memory!]!
    memory(hash: String!): Memory
    related(hash: String!, limit: Int): [Memory!]!
    stats: Stats!
  }
  
  type Mutation {
    store(content: String!, tags: [String]): StoreResult!
    update(hash: String!, content: String!, tags: [String]): UpdateResult!
    delete(hash: String, tag: String): DeleteResult!
  }
  
  type Memory { hash, content, title, preview, tags, createdAt, relevance }
  type MemorySummary { hash, title, preview, tags, createdAt, relevance }
  type Stats { version, totalMemories, totalRelationships, dbSize, dbPath, schemaVersion }

EXAMPLES:
  # Search with summaries
  { memories(query: "typescript", summaryOnly: true) { hash title tags } }
  
  # Get full content by hash
  { memory(hash: "abc123...") { content tags createdAt } }
  
  # Store new memory
  mutation { store(content: "...", tags: ["tag1"]) { hash } }
  
  # Batch multiple operations
  {
    search: memories(query: "mcp", limit: 3) { hash title }
    recent: memories(limit: 5) { hash createdAt }
    stats { totalMemories }
  }
`;
