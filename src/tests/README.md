# Memory Server Tests

Test suite to verify the Simple Memory MCP Server functionality.

## Running Tests

```bash
# Run core test suite (used by CI)
npm test

# Run all tests (comprehensive + export/import + migration + perf + time-range + backup)
npm run test:all

# Run performance benchmarks
npm run benchmark

# Run any individual test directly
node dist/tests/<test-file>.js
```

## Test Coverage

### GraphQL Comprehensive Test
- **CRUD Operations**: Store, search, update, delete via GraphQL
- **Search**: Content search and tag filtering
- **Batching**: Multiple operations in single query
- **Related Memories**: Relationship traversal
- **Error Handling**: Invalid queries, non-existent records

### Performance Tests
- **Large Content**: 1KB - 1MB memory storage
- **Search Performance**: FTS5 query speed validation
- **Throughput**: Operations per second

### Other Tests
- **Export/Import**: Backup and restore functionality
- **Backup**: Backup service (throttling, cleanup, JSON format)
- **Time Range**: Date-based filtering
- **Migration**: Schema versioning and upgrades

## Test Files

```
src/tests/
├── README.md                      # This file
├── graphql-comprehensive-test.ts  # Core GraphQL functionality (11 tests)
├── graphql-test.ts                # Quick GraphQL smoke test
├── export-import-test.ts          # Backup/restore testing
├── backup-test.ts                 # Backup service testing
├── time-range-test.ts             # Date filtering tests
├── performance-test.ts            # Large content validation
├── performance-benchmark.ts       # Comprehensive speed benchmarks
├── graphql-performance-test.ts    # GraphQL layer overhead comparison
└── migration-test.ts              # Schema migration testing
```

Tests automatically clean up their test databases after completion.
