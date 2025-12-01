# Memory Server Tests

Test suite to verify the Simple Memory MCP Server functionality.

## Running Tests

```bash
# Run GraphQL comprehensive test
node dist/tests/graphql-comprehensive-test.js

# Run performance benchmarks
npm run test:perf

# Run export/import test
node dist/tests/export-import-test.js

# Run time-range test
node dist/tests/time-range-test.js
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
- **Time Range**: Date-based filtering
- **Migration**: Schema versioning and upgrades

## Test Files

```
src/tests/
├── README.md                      # This file
├── graphql-comprehensive-test.ts  # Core GraphQL functionality (11 tests)
├── graphql-test.ts                # Quick GraphQL smoke test
├── export-import-test.ts          # Backup/restore testing
├── time-range-test.ts             # Date filtering tests
├── performance-test.ts            # Large content validation
├── performance-benchmark.ts       # Speed benchmarks
└── migration-test.ts              # Schema migration testing
```

Tests automatically clean up their test databases after completion.
