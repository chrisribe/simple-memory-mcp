/**
 * Quick test for GraphQL tool
 */

import { MemoryService } from '../services/memory-service.js';
import { execute } from '../tools/memory-graphql/executor.js';

const dbPath = process.env.MEMORY_DB || './memory.db';
const memoryService = new MemoryService(dbPath);
memoryService.initialize();

const context = { memoryService, config: {} } as any;

async function test() {
  console.log('=== Testing GraphQL Tool ===\n');

  // Test 1: Stats
  console.log('1. Stats query:');
  const stats = await execute({ query: '{ stats { totalMemories version schemaVersion } }' }, context);
  console.log(JSON.stringify(stats, null, 2));

  // Test 2: Search with summaries
  console.log('\n2. Search with title only:');
  const search = await execute({ 
    query: '{ memories(query: "graphql", limit: 2) { hash title tags } }' 
  }, context);
  console.log(JSON.stringify(search, null, 2));

  // Test 3: Get by hash (if we got results)
  if (search.data?.memories?.length > 0) {
    const hash = search.data.memories[0].hash;
    console.log(`\n3. Get full content by hash (${hash.slice(0, 8)}...):`);
    const memory = await execute({ 
      query: `{ memory(hash: "${hash}") { content tags createdAt } }` 
    }, context);
    console.log(JSON.stringify(memory, null, 2));
  }

  // Test 4: Batched query
  console.log('\n4. Batched query (search + stats in one call):');
  const batched = await execute({ 
    query: `{
      recent: memories(limit: 2) { hash title }
      stats { totalMemories totalRelationships }
    }` 
  }, context);
  console.log(JSON.stringify(batched, null, 2));

  // Test 5: Error handling
  console.log('\n5. Error handling (invalid query):');
  const error = await execute({ query: '{ invalid }' }, context);
  console.log(JSON.stringify(error, null, 2));

  memoryService.close();
}

test().catch(console.error);
