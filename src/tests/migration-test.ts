import { MemoryService } from '../services/memory-service.js';
import Database from 'better-sqlite3';
import assert from 'assert';
import { unlinkSync, existsSync } from 'fs';

/**
 * Migration Test Suite
 * Tests old→new schema migration and data integrity
 */

const TEST_DB = './migration-test.db';

function cleanup() {
  const files = [TEST_DB, `${TEST_DB}-shm`, `${TEST_DB}-wal`];
  for (const file of files) {
    try {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

function createOldSchemaDatabase(): void {
  console.log('📦 Creating old schema database...');
  
  const db = new Database(TEST_DB);
  
  // Create original schema without tags table
  db.exec(`
    CREATE TABLE memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT,
      hash TEXT UNIQUE
    )
  `);
  
  db.exec(`
    CREATE TABLE relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_memory_id INTEGER NOT NULL,
      to_memory_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(from_memory_id, to_memory_id),
      FOREIGN KEY (from_memory_id) REFERENCES memories (id) ON DELETE CASCADE,
      FOREIGN KEY (to_memory_id) REFERENCES memories (id) ON DELETE CASCADE
    )
  `);
  
  // Create FTS table
  db.exec(`
    CREATE VIRTUAL TABLE memories_fts USING fts5(
      content,
      content=memories,
      content_rowid=id
    )
  `);
  
  // Insert test data with old-style comma-separated tags
  const insert = db.prepare('INSERT INTO memories (content, tags, created_at, hash) VALUES (?, ?, ?, ?)');
  const now = new Date().toISOString();
  
  insert.run('Memory about TypeScript and testing', 'typescript,testing,dev', now, 'hash1');
  insert.run('Memory about database performance', 'database,performance,optimization', now, 'hash2');
  insert.run('Memory about TypeScript optimization', 'typescript,optimization', now, 'hash3');
  insert.run('Memory with no tags', '', now, 'hash4');
  insert.run('Memory about testing strategies', 'testing,strategy', now, 'hash5');
  
  // Create a relationship
  const insertRel = db.prepare('INSERT INTO relationships (from_memory_id, to_memory_id, relationship_type, created_at) VALUES (?, ?, ?, ?)');
  insertRel.run(1, 3, 'related', now);
  
  db.close();
  console.log('✅ Old schema database created with 5 memories and 1 relationship\n');
}

function testMigration(): void {
  console.log('🔄 Running migration...');
  
  const service = new MemoryService(TEST_DB);
  service.initialize();
  
  console.log('✅ Migration completed\n');
  
  // Test 1: Verify all memories are accessible
  console.log('📊 Test 1: Verify all memories accessible');
  const allMemories = service.search('', [], undefined, 10);
  assert.strictEqual(allMemories.length, 5, `Expected 5 memories, got ${allMemories.length}`);
  console.log(`✅ All 5 memories accessible\n`);
  
  // Test 2: Verify tag normalization
  console.log('📊 Test 2: Verify tag normalization and indexing');
  const typescriptResults = service.search(undefined, ['typescript'], undefined, 10);
  assert.strictEqual(typescriptResults.length, 2, `Expected 2 memories with 'typescript' tag, got ${typescriptResults.length}`);
  console.log(`✅ Found ${typescriptResults.length} memories with 'typescript' tag`);
  
  const testingResults = service.search(undefined, ['testing'], undefined, 10);
  assert.strictEqual(testingResults.length, 2, `Expected 2 memories with 'testing' tag, got ${testingResults.length}`);
  console.log(`✅ Found ${testingResults.length} memories with 'testing' tag`);
  
  const optimizationResults = service.search(undefined, ['optimization'], undefined, 10);
  assert.strictEqual(optimizationResults.length, 2, `Expected 2 memories with 'optimization' tag, got ${optimizationResults.length}`);
  console.log(`✅ Found ${optimizationResults.length} memories with 'optimization' tag\n`);
  
  // Test 3: Verify memory with no tags
  console.log('📊 Test 3: Verify memory with no tags');
  const memory4 = allMemories.find(m => m.hash === 'hash4');
  assert(memory4, 'Memory with hash4 not found');
  assert.strictEqual(memory4.tags.length, 0, `Expected 0 tags, got ${memory4.tags.length}`);
  console.log(`✅ Memory with no tags handled correctly\n`);
  
  // Test 4: Verify tags are arrays on retrieved memories
  console.log('📊 Test 4: Verify tags are arrays');
  for (const memory of allMemories) {
    assert(Array.isArray(memory.tags), `Tags for memory ${memory.hash} should be an array`);
  }
  console.log(`✅ All memories have tags as arrays\n`);
  
  // Test 5: Verify tag case normalization
  console.log('📊 Test 5: Verify tag case normalization');
  const memory1 = allMemories.find(m => m.hash === 'hash1');
  assert(memory1, 'Memory with hash1 not found');
  assert(memory1.tags.includes('typescript'), 'Should have lowercase "typescript" tag');
  assert(memory1.tags.includes('testing'), 'Should have lowercase "testing" tag');
  console.log(`✅ Tags normalized to lowercase\n`);
  
  // Test 6: Verify relationships preserved
  console.log('📊 Test 6: Verify relationships preserved');
  const stats = service.stats();
  assert.strictEqual(stats.totalMemories, 5, `Expected 5 memories, got ${stats.totalMemories}`);
  assert.strictEqual(stats.totalRelationships, 1, `Expected 1 relationship, got ${stats.totalRelationships}`);
  console.log(`✅ Relationships preserved: ${stats.totalRelationships}\n`);
  
  // Test 7: Verify FTS search still works
  console.log('📊 Test 7: Verify FTS search functionality');
  const ftsResults = service.search('TypeScript', undefined, undefined, 10);
  assert(ftsResults.length >= 2, `Expected at least 2 FTS results, got ${ftsResults.length}`);
  console.log(`✅ FTS search working: ${ftsResults.length} results\n`);
  
  // Test 8: Verify new memories work with migrated schema
  console.log('📊 Test 8: Verify new memory insertion');
  const newHash = service.store('New memory after migration', ['migration', 'test']);
  const newMemory = service.search(undefined, ['migration'], undefined, 10);
  assert(newMemory.length >= 1, 'New memory should be findable by tag');
  console.log(`✅ New memory insertion works\n`);
  
  // Test 9: Verify deleteByTag works with new schema
  console.log('📊 Test 9: Verify deleteByTag functionality');
  const beforeDelete = service.stats();
  const deletedCount = service.deleteByTag('strategy');
  assert.strictEqual(deletedCount, 1, `Expected to delete 1 memory, deleted ${deletedCount}`);
  const afterDelete = service.stats();
  assert.strictEqual(afterDelete.totalMemories, beforeDelete.totalMemories - 1, 'Memory count should decrease by 1');
  console.log(`✅ Deleted ${deletedCount} memory by tag\n`);
  
  // Test 10: Verify database indexes exist
  console.log('📊 Test 10: Verify database indexes created');
  const db = (service as any).db;
  const indexes = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='index' AND sql IS NOT NULL
  `).all() as Array<{ name: string }>;
  
  const expectedIndexes = [
    'idx_tags_tag',
    'idx_tags_memory_id',
    'idx_memories_created_at',
    'idx_memories_hash',
    'idx_relationships_from',
    'idx_relationships_to',
    'idx_relationships_composite'
  ];
  
  for (const expectedIndex of expectedIndexes) {
    const found = indexes.some(idx => idx.name === expectedIndex);
    assert(found, `Index ${expectedIndex} should exist`);
  }
  console.log(`✅ All ${expectedIndexes.length} performance indexes created\n`);
  
  // Test 11: Verify migration tracking
  console.log('📊 Test 11: Verify migration tracking table');
  const migrations = db.prepare('SELECT * FROM schema_migrations ORDER BY version').all() as Array<{ version: number; description: string }>;
  assert(migrations.length >= 3, `Expected at least 3 migrations, found ${migrations.length}`);
  assert.strictEqual(migrations[0].version, 1, 'First migration should be version 1');
  assert.strictEqual(migrations[1].version, 2, 'Second migration should be version 2');
  assert.strictEqual(migrations[2].version, 3, 'Third migration should be version 3');
  console.log(`✅ Migration tracking working: ${migrations.length} migrations recorded\n`);
  
  service.close();
}

function testPartialMigrationRecovery(): void {
  console.log('🔄 Test 12: Verify partial migration recovery');
  console.log('(Creating database with only migration 1 applied)');
  
  cleanup();
  
  const db = new Database(TEST_DB);
  
  // Create base schema
  db.exec(`
    CREATE TABLE memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      tags TEXT,
      created_at TEXT,
      hash TEXT UNIQUE
    )
  `);
  
  // Create migration tracking with only v1
  db.exec(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `);
  
  db.prepare('INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?)')
    .run(1, 'Initial schema', new Date().toISOString());
  
  // Add test data
  db.prepare('INSERT INTO memories (content, tags, created_at, hash) VALUES (?, ?, ?, ?)')
    .run('Recovery test memory', 'recovery,test', new Date().toISOString(), 'recovery1');
  
  db.close();
  
  // Now initialize service - should apply migrations 2 and 3
  const service = new MemoryService(TEST_DB);
  service.initialize();
  
  // Verify migrations 2 and 3 were applied
  const migrationsAfter = (service as any).db.prepare('SELECT * FROM schema_migrations ORDER BY version').all() as Array<{ version: number }>;
  assert.strictEqual(migrationsAfter.length, 3, `Expected 3 migrations, found ${migrationsAfter.length}`);
  
  // Verify tags table exists and data migrated
  const tagResults = service.search(undefined, ['recovery'], undefined, 10);
  assert.strictEqual(tagResults.length, 1, 'Should find memory by migrated tag');
  
  console.log('✅ Partial migration recovery successful\n');
  
  service.close();
}

function testIdempotentMigration(): void {
  console.log('🔄 Test 13: Verify idempotent migration (running twice)');
  
  cleanup();
  createOldSchemaDatabase();
  
  // Run migration first time
  const service1 = new MemoryService(TEST_DB);
  service1.initialize();
  const stats1 = service1.stats();
  service1.close();
  
  // Run migration second time (should be no-op)
  const service2 = new MemoryService(TEST_DB);
  service2.initialize();
  const stats2 = service2.stats();
  
  assert.strictEqual(stats1.totalMemories, stats2.totalMemories, 'Memory count should be same');
  assert.strictEqual(stats1.totalRelationships, stats2.totalRelationships, 'Relationship count should be same');
  
  console.log('✅ Idempotent migration verified (no duplicate data)\n');
  
  service2.close();
}

async function runMigrationTests() {
  console.log('═══════════════════════════════════════════');
  console.log('🧪 Migration Test Suite');
  console.log('═══════════════════════════════════════════\n');
  
  try {
    // Cleanup any existing test database
    cleanup();
    
    // Test 1-11: Standard migration path
    createOldSchemaDatabase();
    testMigration();
    
    // Test 12: Partial migration recovery
    testPartialMigrationRecovery();
    
    // Test 13: Idempotent migration
    testIdempotentMigration();
    
    // Final cleanup
    cleanup();
    
    console.log('═══════════════════════════════════════════');
    console.log('✅ All Migration Tests Passed!');
    console.log('═══════════════════════════════════════════\n');
    console.log('Summary:');
    console.log('  ✓ Old→new schema migration');
    console.log('  ✓ Tag normalization and indexing');
    console.log('  ✓ Data integrity preservation');
    console.log('  ✓ Relationship preservation');
    console.log('  ✓ FTS functionality maintained');
    console.log('  ✓ New operations work post-migration');
    console.log('  ✓ Delete operations work');
    console.log('  ✓ Performance indexes created');
    console.log('  ✓ Migration tracking functional');
    console.log('  ✓ Partial migration recovery');
    console.log('  ✓ Idempotent migration (safe re-run)');
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Migration Test Failed:', error.message);
    console.error(error.stack);
    cleanup();
    process.exit(1);
  }
}

runMigrationTests().catch(error => {
  console.error('Fatal error:', error);
  cleanup();
  process.exit(1);
});
