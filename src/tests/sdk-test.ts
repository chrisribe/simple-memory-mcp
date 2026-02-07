/**
 * SDK Test - Verify the SDK wrapper works correctly
 */

import { createMemoryClient } from '../sdk.js';
import { unlink } from 'fs';

const testDbPath = './test-sdk.db';

console.log('=== SDK Test ===\n');

try {
  // Create client
  console.log('1. Creating SDK client...');
  const client = createMemoryClient(testDbPath);
  console.log('✓ Client created\n');

  // Store memories
  console.log('2. Storing memories...');
  const hash1 = client.store('Test memory 1', ['test', 'example']);
  const hash2 = client.store('Test memory 2', ['test']);
  console.log(`✓ Stored 2 memories (${hash1.substring(0, 8)}..., ${hash2.substring(0, 8)}...)\n`);

  // Search
  console.log('3. Searching memories...');
  const results = client.search('test');
  console.log(`✓ Found ${results.length} memories\n`);

  // Get by hash
  console.log('4. Getting memory by hash...');
  const memory = client.getByHash(hash1);
  if (!memory) {
    throw new Error('Failed to get memory by hash');
  }
  console.log(`✓ Retrieved: "${memory.content}"\n`);

  // Update
  console.log('5. Updating memory...');
  const newHash = client.update(hash1, 'Updated test memory 1', ['test', 'updated']);
  if (!newHash) {
    throw new Error('Failed to update memory');
  }
  console.log(`✓ Updated (new hash: ${newHash.substring(0, 8)}...)\n`);

  // Link memories
  console.log('6. Linking memories...');
  const linked = client.linkMemories(newHash, hash2, 'related');
  console.log(`✓ Linked: ${linked}\n`);

  // Get related
  console.log('7. Getting related memories...');
  const related = client.getRelated(newHash);
  console.log(`✓ Found ${related.length} related memories\n`);

  // Stats
  console.log('8. Getting statistics...');
  const stats = client.stats();
  console.log(`✓ Total memories: ${stats.totalMemories}`);
  console.log(`✓ Total relationships: ${stats.totalRelationships}\n`);

  // Export
  console.log('9. Exporting memories...');
  const exportData = client.exportMemories();
  console.log(`✓ Exported ${exportData.totalMemories} memories\n`);

  // Delete
  console.log('10. Deleting by tag...');
  const deleted = client.deleteByTag('test');
  console.log(`✓ Deleted ${deleted} memories\n`);

  // Close
  console.log('11. Closing client...');
  client.close();
  console.log('✓ Client closed\n');

  console.log('=== All tests passed! ===');

} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
} finally {
  // Cleanup
  try {
    unlink(testDbPath, () => {});
  } catch (e) {
    // Ignore cleanup errors
  }
}
