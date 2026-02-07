/**
 * Simple Memory SDK - Advanced Usage Example (Node.js)
 * 
 * This example demonstrates advanced features like date filtering,
 * relevance scoring, import/export, and backup functionality.
 */

import { createMemoryClient } from 'simple-memory-mcp/sdk';
import { writeFileSync, readFileSync } from 'fs';

const client = createMemoryClient('./advanced-example.db');

console.log('=== Simple Memory SDK - Advanced Features ===\n');

// 1. Date-based filtering
console.log('1. Storing memories at different times...');
const memory1 = client.store('Old task from last week', ['task']);
const memory2 = client.store('Recent update on the project', ['project', 'update']);
const memory3 = client.store('Today\'s meeting notes', ['meeting']);
console.log('Stored 3 memories\n');

// Search for recent memories only (last 7 days)
console.log('2. Searching memories from last 7 days...');
const recentMemories = client.search(undefined, undefined, 10, 7);
console.log(`Found ${recentMemories.length} memories from the last week\n`);

// 3. Relevance-based search
console.log('3. Full-text search with relevance scoring...');
client.store('JavaScript is a programming language', ['programming']);
client.store('Java is also a programming language', ['programming']);
client.store('Python programming is fun', ['programming']);
client.store('I like JavaScript frameworks', ['programming', 'web']);

const results = client.search('JavaScript', undefined, 10, undefined, undefined, undefined, 0.01);
console.log(`Found ${results.length} results for "JavaScript":`);
results.forEach(m => {
  const relevance = m.relevance ? ` (relevance: ${m.relevance.toFixed(3)})` : '';
  console.log(`  - ${m.content}${relevance}`);
});
console.log();

// 4. Date range filtering
console.log('4. Date range filtering...');
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30); // 30 days ago
const endDate = new Date(); // today

const rangeResults = client.search(undefined, ['programming'], 10, undefined, startDate, endDate);
console.log(`Found ${rangeResults.length} programming memories in the last 30 days\n`);

// 5. Export with filters
console.log('5. Exporting memories with filters...');
const exportData = client.exportMemories({
  tags: ['programming'],
  limit: 5
});

// Save export to file
const exportFilename = './memory-export.json';
writeFileSync(exportFilename, JSON.stringify(exportData, null, 2));
console.log(`Exported ${exportData.totalMemories} memories to ${exportFilename}`);
console.log(`Export metadata:`);
console.log(`  - Export version: ${exportData.exportVersion}`);
console.log(`  - Exported at: ${exportData.exportedAt}`);
console.log(`  - Source: ${exportData.source || 'N/A'}\n`);

// 6. Import memories
console.log('6. Importing memories from file...');
// Create a new client with a different database
const importClient = createMemoryClient('./imported-memory.db');

const importJson = readFileSync(exportFilename, 'utf-8');
const importResult = importClient.importMemories(importJson, {
  skipDuplicates: true,
  preserveTimestamps: true
});

console.log(`Import results:`);
console.log(`  - Imported: ${importResult.imported}`);
console.log(`  - Skipped: ${importResult.skipped}`);
console.log(`  - Errors: ${importResult.errors.length}\n`);

// 7. Create a manual backup
console.log('7. Creating manual backup...');
const backupPath = client.createBackup('example-backup');
if (backupPath) {
  console.log(`Backup created at: ${backupPath}\n`);
} else {
  console.log('Backup is disabled or failed\n');
}

// 8. Complex queries
console.log('8. Complex multi-criteria search...');
// Search for memories with specific tags AND text content from last 7 days
const complexResults = client.search('update', ['project', 'update'], 5, 7);
console.log(`Found ${complexResults.length} results matching all criteria\n`);

// 9. Working with relationships
console.log('9. Building a knowledge graph...');
const concept1 = client.store('Machine Learning is a subset of AI', ['ai', 'ml']);
const concept2 = client.store('Deep Learning is a subset of Machine Learning', ['ai', 'ml', 'dl']);
const concept3 = client.store('Neural Networks are used in Deep Learning', ['ai', 'dl', 'nn']);

client.linkMemoriesBulk([
  { fromHash: concept2, toHash: concept1, relationshipType: 'is-subset-of' },
  { fromHash: concept3, toHash: concept2, relationshipType: 'used-in' }
]);

const relatedConcepts = client.getRelated(concept1, 5);
console.log(`Found ${relatedConcepts.length} concepts related to Machine Learning:`);
relatedConcepts.forEach(m => {
  console.log(`  - ${m.content}`);
});
console.log();

// 10. Statistics and monitoring
console.log('10. Monitoring database health...');
const stats = client.stats();
console.log(`Database Statistics:`);
console.log(`  - Total memories: ${stats.totalMemories}`);
console.log(`  - Total relationships: ${stats.totalRelationships}`);
console.log(`  - Database size: ${(stats.dbSize / 1024).toFixed(2)} KB`);
console.log(`  - Schema version: ${stats.schemaVersion}`);
console.log(`  - Version: ${stats.version}`);
if (stats.backupEnabled) {
  console.log(`  - Backup enabled: Yes`);
  console.log(`  - Backup path: ${stats.backupPath}`);
  console.log(`  - Backup count: ${stats.backupCount || 0}`);
}
console.log();

// Cleanup
console.log('Cleaning up...');
client.close();
importClient.close();
console.log('Done!');
