/**
 * Comprehensive GraphQL Test Suite
 * Tests all CRUD operations, search, batching, and error handling via GraphQL
 */

import { MemoryService } from '../services/memory-service.js';
import { execute } from '../tools/memory-graphql/executor.js';
import { unlink } from 'fs/promises';

const TEST_DB = './test-graphql.db';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

let memoryService: MemoryService;
let context: any;

async function setup() {
  // Clean up any existing test database
  try {
    await unlink(TEST_DB);
  } catch { /* ignore if doesn't exist */ }

  memoryService = new MemoryService(TEST_DB);
  memoryService.initialize();
  context = { memoryService, config: {} };
}

async function cleanup() {
  memoryService?.close();
  try {
    await unlink(TEST_DB);
  } catch { /* ignore */ }
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<TestResult> {
  const start = Date.now();
  try {
    await testFn();
    return { name, success: true, duration: Date.now() - start };
  } catch (error) {
    return { 
      name, 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start 
    };
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testStats() {
  const result = await execute({ query: '{ stats { totalMemories version schemaVersion } }' }, context);
  
  if (result.errors) throw new Error(`Stats query failed: ${result.errors[0].message}`);
  if (typeof result.data?.stats?.totalMemories !== 'number') {
    throw new Error('Stats should return totalMemories as number');
  }
  if (!result.data?.stats?.version) {
    throw new Error('Stats should return version');
  }
  console.log(`  ✓ Stats: ${result.data.stats.totalMemories} memories, v${result.data.stats.version}`);
}

async function testStoreMutation(): Promise<string> {
  const result = await execute({
    query: `mutation {
      store(content: "Test memory for GraphQL comprehensive test", tags: ["test", "graphql"]) {
        success
        hash
        error
      }
    }`
  }, context);

  if (result.errors) throw new Error(`Store mutation failed: ${result.errors[0].message}`);
  if (!result.data?.store?.success) {
    throw new Error(`Store failed: ${result.data?.store?.error || 'unknown'}`);
  }
  if (!result.data?.store?.hash) {
    throw new Error('Store should return hash');
  }
  
  console.log(`  ✓ Stored memory with hash: ${result.data.store.hash.slice(0, 8)}...`);
  return result.data.store.hash;
}

async function testSearchByQuery(expectedHash: string) {
  const result = await execute({
    query: '{ memories(query: "comprehensive test", limit: 5) { hash title tags } }'
  }, context);

  if (result.errors) throw new Error(`Search failed: ${result.errors[0].message}`);
  if (!Array.isArray(result.data?.memories)) {
    throw new Error('Search should return memories array');
  }
  
  const found = result.data.memories.find((m: any) => m.hash === expectedHash);
  if (!found) {
    throw new Error('Should find the stored memory by content search');
  }
  
  console.log(`  ✓ Found ${result.data.memories.length} memories by content search`);
}

async function testSearchByTags(expectedHash: string) {
  const result = await execute({
    query: '{ memories(tags: ["graphql"], limit: 10) { hash title tags } }'
  }, context);

  if (result.errors) throw new Error(`Tag search failed: ${result.errors[0].message}`);
  if (!Array.isArray(result.data?.memories)) {
    throw new Error('Tag search should return memories array');
  }
  
  const found = result.data.memories.find((m: any) => m.hash === expectedHash);
  if (!found) {
    throw new Error('Should find the stored memory by tag search');
  }
  
  console.log(`  ✓ Found ${result.data.memories.length} memories by tag search`);
}

async function testGetByHash(hash: string) {
  const result = await execute({
    query: `{ memory(hash: "${hash}") { hash content tags createdAt } }`
  }, context);

  if (result.errors) throw new Error(`Get by hash failed: ${result.errors[0].message}`);
  if (!result.data?.memory) {
    throw new Error('Should find memory by hash');
  }
  if (result.data.memory.hash !== hash) {
    throw new Error('Returned hash should match requested hash');
  }
  if (!result.data.memory.content.includes('comprehensive test')) {
    throw new Error('Content should match stored content');
  }
  
  console.log(`  ✓ Retrieved memory by hash with ${result.data.memory.tags.length} tags`);
}

async function testUpdateMutation(hash: string): Promise<string> {
  // First, get the original memory to check createdAt
  const originalResult = await execute({
    query: `{ memory(hash: "${hash}") { createdAt updatedAt } }`
  }, context);
  
  if (originalResult.errors || !originalResult.data?.memory) {
    throw new Error('Failed to get original memory');
  }
  
  const originalCreatedAt = originalResult.data.memory.createdAt;
  const originalUpdatedAt = originalResult.data.memory.updatedAt;
  
  // Wait a bit to ensure timestamp difference
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Now update the memory
  const result = await execute({
    query: `mutation {
      update(hash: "${hash}", content: "Updated content for GraphQL test", tags: ["test", "graphql", "updated"]) {
        success
        newHash
        error
      }
    }`
  }, context);

  if (result.errors) throw new Error(`Update mutation failed: ${result.errors[0].message}`);
  if (!result.data?.update?.success) {
    throw new Error(`Update failed: ${result.data?.update?.error || 'unknown'}`);
  }
  if (!result.data?.update?.newHash) {
    throw new Error('Update should return newHash');
  }
  
  // Verify old hash no longer exists
  const oldCheck = await execute({
    query: `{ memory(hash: "${hash}") { hash } }`
  }, context);
  
  if (oldCheck.data?.memory) {
    throw new Error('Old hash should no longer exist after update');
  }
  
  // Verify the updated memory has updatedAt field set
  const updatedMemory = await execute({
    query: `{ memory(hash: "${result.data.update.newHash}") { createdAt updatedAt } }`
  }, context);
  
  if (updatedMemory.errors || !updatedMemory.data?.memory) {
    throw new Error('Failed to get updated memory');
  }
  
  // Check that createdAt is preserved
  if (updatedMemory.data.memory.createdAt !== originalCreatedAt) {
    throw new Error('createdAt should be preserved after update');
  }
  
  // Check that updatedAt is set and different from original (if it existed)
  if (!updatedMemory.data.memory.updatedAt) {
    throw new Error('updatedAt should be set after update');
  }
  
  if (originalUpdatedAt && updatedMemory.data.memory.updatedAt === originalUpdatedAt) {
    throw new Error('updatedAt should change after update');
  }
  
  console.log(`  ✓ Updated memory, new hash: ${result.data.update.newHash.slice(0, 8)}...`);
  console.log(`  ✓ Verified updatedAt is set: ${updatedMemory.data.memory.updatedAt}`);
  return result.data.update.newHash;
}

async function testDeleteMutation(hash: string) {
  const result = await execute({
    query: `mutation {
      delete(hash: "${hash}") {
        success
        deletedCount
        error
      }
    }`
  }, context);

  if (result.errors) throw new Error(`Delete mutation failed: ${result.errors[0].message}`);
  if (!result.data?.delete?.success) {
    throw new Error(`Delete failed: ${result.data?.delete?.error || 'unknown'}`);
  }
  if (result.data?.delete?.deletedCount !== 1) {
    throw new Error('Should delete exactly 1 memory');
  }
  
  // Verify deletion
  const check = await execute({
    query: `{ memory(hash: "${hash}") { hash } }`
  }, context);
  
  if (check.data?.memory) {
    throw new Error('Deleted memory should not be found');
  }
  
  console.log(`  ✓ Deleted memory successfully`);
}

async function testBatchedQuery() {
  // Store some test data first
  await execute({
    query: `mutation { store(content: "Batch test memory 1", tags: ["batch"]) { hash } }`
  }, context);
  await execute({
    query: `mutation { store(content: "Batch test memory 2", tags: ["batch"]) { hash } }`
  }, context);

  // Batched query - multiple operations in one call
  const result = await execute({
    query: `{
      batchSearch: memories(tags: ["batch"], limit: 5) { hash title }
      stats { totalMemories totalRelationships }
    }`
  }, context);

  if (result.errors) throw new Error(`Batched query failed: ${result.errors[0].message}`);
  if (!Array.isArray(result.data?.batchSearch)) {
    throw new Error('Batched search should return array');
  }
  if (typeof result.data?.stats?.totalMemories !== 'number') {
    throw new Error('Batched stats should return totalMemories');
  }
  
  console.log(`  ✓ Batched query: ${result.data.batchSearch.length} results + stats in one call`);
  
  // Cleanup batch test data
  await execute({
    query: `mutation { delete(tag: "batch") { deletedCount } }`
  }, context);
}

async function testDeleteByTag() {
  // Store test memories with specific tag
  await execute({
    query: `mutation { store(content: "Delete by tag test 1", tags: ["delete-test"]) { hash } }`
  }, context);
  await execute({
    query: `mutation { store(content: "Delete by tag test 2", tags: ["delete-test"]) { hash } }`
  }, context);
  
  // Delete by tag
  const result = await execute({
    query: `mutation { delete(tag: "delete-test") { success deletedCount } }`
  }, context);

  if (result.errors) throw new Error(`Delete by tag failed: ${result.errors[0].message}`);
  if (!result.data?.delete?.success) {
    throw new Error('Delete by tag should succeed');
  }
  if (result.data?.delete?.deletedCount < 2) {
    throw new Error('Should delete at least 2 memories');
  }
  
  console.log(`  ✓ Deleted ${result.data.delete.deletedCount} memories by tag`);
}

async function testErrorHandling() {
  // Invalid query syntax
  const syntaxError = await execute({ query: '{ invalid' }, context);
  if (!syntaxError.errors || syntaxError.errors.length === 0) {
    throw new Error('Invalid syntax should return errors');
  }
  
  // Non-existent field
  const fieldError = await execute({ query: '{ nonExistentField }' }, context);
  if (!fieldError.errors || fieldError.errors.length === 0) {
    throw new Error('Non-existent field should return errors');
  }
  
  // Update non-existent memory
  const updateError = await execute({
    query: `mutation { update(hash: "nonexistent123", content: "test") { success error } }`
  }, context);
  if (updateError.data?.update?.success !== false) {
    throw new Error('Update non-existent should return success: false');
  }
  
  // Delete without hash or tag
  const deleteError = await execute({
    query: `mutation { delete { success error } }`
  }, context);
  if (deleteError.data?.delete?.success !== false) {
    throw new Error('Delete without params should return success: false');
  }
  
  console.log(`  ✓ Error handling works correctly`);
}

async function testRelatedMemories() {
  // Store related memories
  const result1 = await execute({
    query: `mutation { store(content: "TypeScript fundamentals guide", tags: ["typescript", "guide"]) { hash } }`
  }, context);
  const hash1 = result1.data?.store?.hash;
  
  await execute({
    query: `mutation { store(content: "Advanced TypeScript patterns", tags: ["typescript", "advanced"]) { hash } }`
  }, context);
  
  // Query related memories
  const related = await execute({
    query: `{ related(hash: "${hash1}", limit: 5) { hash title tags } }`
  }, context);

  if (related.errors) throw new Error(`Related query failed: ${related.errors[0].message}`);
  // Related might be empty if no relationships created, that's OK
  console.log(`  ✓ Related query returned ${related.data?.related?.length || 0} related memories`);
  
  // Cleanup
  await execute({
    query: `mutation { delete(tag: "typescript") { deletedCount } }`
  }, context);
}

// ============================================================================
// MAIN
// ============================================================================

async function runAllTests() {
  console.log('🧪 GraphQL Comprehensive Test Suite');
  console.log('====================================\n');

  await setup();
  
  const results: TestResult[] = [];
  let storedHash = '';
  let updatedHash = '';

  // Run tests in sequence (some depend on previous results)
  console.log('Running tests...\n');

  results.push(await runTest('Stats Query', testStats));
  
  results.push(await runTest('Store Mutation', async () => {
    storedHash = await testStoreMutation();
  }));
  
  results.push(await runTest('Search by Query', async () => {
    await testSearchByQuery(storedHash);
  }));
  
  results.push(await runTest('Search by Tags', async () => {
    await testSearchByTags(storedHash);
  }));
  
  results.push(await runTest('Get by Hash', async () => {
    await testGetByHash(storedHash);
  }));
  
  results.push(await runTest('Update Mutation', async () => {
    updatedHash = await testUpdateMutation(storedHash);
  }));
  
  results.push(await runTest('Delete Mutation', async () => {
    await testDeleteMutation(updatedHash);
  }));
  
  results.push(await runTest('Batched Query', testBatchedQuery));
  results.push(await runTest('Delete by Tag', testDeleteByTag));
  results.push(await runTest('Related Memories', testRelatedMemories));
  results.push(await runTest('Error Handling', testErrorHandling));

  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  for (const r of results) {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.name} (${r.duration}ms)${r.error ? ` - ${r.error}` : ''}`);
  }
  
  console.log(`\nPassed: ${passed}/${total}`);
  console.log(`Total time: ${totalTime}ms`);
  
  await cleanup();
  console.log('\n🧹 Test database cleaned up');

  if (passed !== total) {
    console.log('\n💥 Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
  }
}

runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
