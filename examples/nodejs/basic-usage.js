/**
 * Simple Memory SDK - Basic Usage Example (Node.js)
 * 
 * This example demonstrates how to use the Simple Memory SDK
 * in a Node.js application.
 */

import { createMemoryClient } from 'simple-memory-mcp/sdk';

// Create a client instance with a custom database path
const client = createMemoryClient('./examples-memory.db');

console.log('=== Simple Memory SDK - Node.js Example ===\n');

// 1. Store some memories with tags
console.log('1. Storing memories...');
const hash1 = client.store('Met with John about the project deadline', ['meeting', 'project']);
const hash2 = client.store('Remember to buy groceries: milk, eggs, bread', ['todo', 'personal']);
const hash3 = client.store('Code review feedback: Add more unit tests', ['work', 'code-review']);
const hash4 = client.store('Great idea for the new feature: auto-save functionality', ['idea', 'feature']);

console.log(`Stored 4 memories`);
console.log(`First memory hash: ${hash1}\n`);

// 2. Search for memories
console.log('2. Searching for memories...');
const workMemories = client.search(undefined, ['work']);
console.log(`Found ${workMemories.length} work-related memories:`);
workMemories.forEach(m => {
  console.log(`  - ${m.content.substring(0, 50)}...`);
});
console.log();

// 3. Full-text search
console.log('3. Full-text search for "project"...');
const projectResults = client.search('project');
console.log(`Found ${projectResults.length} memories containing "project":`);
projectResults.forEach(m => {
  console.log(`  - ${m.content}`);
  console.log(`    Tags: ${m.tags.join(', ')}`);
  console.log(`    Created: ${m.createdAt}`);
});
console.log();

// 4. Get a specific memory by hash
console.log('4. Retrieving memory by hash...');
const memory = client.getByHash(hash1);
if (memory) {
  console.log(`Content: ${memory.content}`);
  console.log(`Tags: ${memory.tags.join(', ')}\n`);
}

// 5. Update a memory
console.log('5. Updating a memory...');
const newHash = client.update(hash2, 'Remember to buy groceries: milk, eggs, bread, coffee', ['todo', 'personal', 'urgent']);
console.log(`Memory updated. New hash: ${newHash}\n`);

// 6. Link related memories
console.log('6. Creating memory relationships...');
client.linkMemories(hash1, hash3, 'related');
client.linkMemories(hash4, hash1, 'implements');
console.log('Linked memories with relationships\n');

// 7. Get related memories
console.log('7. Finding related memories...');
const related = client.getRelated(hash1);
console.log(`Found ${related.length} memories related to the first memory:`);
related.forEach(m => {
  console.log(`  - ${m.content.substring(0, 50)}...`);
});
console.log();

// 8. Get database statistics
console.log('8. Database statistics:');
const stats = client.stats();
console.log(`Total memories: ${stats.totalMemories}`);
console.log(`Total relationships: ${stats.totalRelationships}`);
console.log(`Database size: ${(stats.dbSize / 1024).toFixed(2)} KB`);
console.log(`Database path: ${stats.dbPath}\n`);

// 9. Export memories
console.log('9. Exporting memories...');
const exportData = client.exportMemories({ tags: ['work'] });
console.log(`Exported ${exportData.totalMemories} work-related memories`);
console.log(`Export version: ${exportData.exportVersion}\n`);

// 10. Bulk relationship creation
console.log('10. Creating bulk relationships...');
const bulkCount = client.linkMemoriesBulk([
  { fromHash: hash2, toHash: hash4, relationshipType: 'inspired-by' },
  { fromHash: hash3, toHash: hash4, relationshipType: 'feedback' }
]);
console.log(`Created ${bulkCount} bulk relationships\n`);

// 11. Delete a memory by tag
console.log('11. Cleaning up - deleting test memories...');
const deletedCount = client.deleteByTag('todo');
console.log(`Deleted ${deletedCount} memories with 'todo' tag\n`);

// Final stats
console.log('Final statistics:');
const finalStats = client.stats();
console.log(`Total memories: ${finalStats.totalMemories}`);
console.log(`Total relationships: ${finalStats.totalRelationships}\n`);

// Always close the client when done
console.log('Closing database connection...');
client.close();
console.log('Done!');
