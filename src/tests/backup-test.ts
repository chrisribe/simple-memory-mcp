/**
 * Backup Service Test Suite
 * 
 * Tests the backup service which now exports memories as JSON files:
 * - Automatic backup on write operations
 * - Backup throttling (interval-based)
 * - Backup file cleanup (max backups)
 * - JSON export format validation
 * - Source identifier support
 * - Manual backup creation
 */

import { existsSync, unlinkSync, readdirSync, readFileSync, rmdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { MemoryService } from '../services/memory-service.js';
import { BackupService, BackupConfig } from '../services/backup-service.js';
import { clearConfigCache } from '../utils/config.js';

const TEST_DB = './test-backup.db';
const BACKUP_DIR = './test-backup-dir';

// ==========================================
// Test Utilities
// ==========================================

function cleanup() {
  clearConfigCache();
  [TEST_DB, TEST_DB + '-wal', TEST_DB + '-shm'].forEach(file => {
    try { if (existsSync(file)) unlinkSync(file); } catch {}
  });
  try {
    if (existsSync(BACKUP_DIR)) {
      readdirSync(BACKUP_DIR).forEach(f => unlinkSync(join(BACKUP_DIR, f)));
      rmdirSync(BACKUP_DIR);
    }
  } catch {}
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`[FAIL] ${message}`);
  console.log(`[PASS] ${message}`);
}

function getBackupFiles(): string[] {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json') && f.startsWith('smem_'));
}

function createBackupService(
  memService: MemoryService, 
  overrides: Partial<BackupConfig> = {}
): BackupService {
  return new BackupService({
    backupPath: BACKUP_DIR,
    autoBackupInterval: 0,
    maxBackups: 10,
    getBackupData: () => memService.exportMemories(),
    ...overrides
  });
}

// Data-driven validation for memory fields
const REQUIRED_MEMORY_FIELDS = ['id', 'content', 'hash', 'createdAt'] as const;

function assertMemoryFormat(memory: any, label: string = 'Memory') {
  REQUIRED_MEMORY_FIELDS.forEach(field => {
    assert(memory[field] !== undefined, `${label} has ${field}`);
  });
  assert(Array.isArray(memory.tags), `${label} has tags array`);
}

function assertBackupMetadata(data: any, expectedMemories: number, source?: string) {
  assert(data.totalMemories === expectedMemories, `Backup contains ${expectedMemories} memories`);
  assert(data.exportVersion !== undefined, 'Export version present');
  assert(data.exportedAt !== undefined, 'Export timestamp present');
  assert(Array.isArray(data.memories), 'Memories is an array');
  if (source) {
    assert(data.source === source, `Source is "${source}"`);
  }
}

// ==========================================
// Test Cases (Data-Driven)
// ==========================================

interface ThrottleTestCase {
  name: string;
  interval: number;
  elapsedMinutes: number;
  shouldTrigger: boolean;
}

const THROTTLE_TEST_CASES: ThrottleTestCase[] = [
  { name: 'immediately after backup', interval: 60, elapsedMinutes: 0, shouldTrigger: false },
  { name: 'after 30 minutes (half interval)', interval: 60, elapsedMinutes: 30, shouldTrigger: false },
  { name: 'after 59 minutes (just before)', interval: 60, elapsedMinutes: 59, shouldTrigger: false },
  { name: 'after 61 minutes (just after)', interval: 60, elapsedMinutes: 61, shouldTrigger: true },
  { name: 'after 24 hours', interval: 60, elapsedMinutes: 1440, shouldTrigger: true },
  { name: 'with interval=0 (always)', interval: 0, elapsedMinutes: 0, shouldTrigger: true },
];

// ==========================================
// Test Runner
// ==========================================

async function runTests() {
  console.log('\n=== Starting Backup Service Tests ===\n');
  
  cleanup();
  mkdirSync(BACKUP_DIR, { recursive: true });
  
  const memService = new MemoryService(TEST_DB);
  memService.initialize();
  
  // Seed test data
  const testMemories = [
    { content: 'Test memory 1', tags: ['test', 'backup'] },
    { content: 'Test memory 2', tags: ['test', 'important'] },
    { content: 'Test memory 3 with relationship', tags: ['test'] },
  ];
  testMemories.forEach(m => memService.store(m.content, m.tags));
  
  try {
    // ==========================================
    // Test 1: JSON Export Creation
    // ==========================================
    console.log('[TEST 1] BackupService creates JSON export files');
    
    const backupService = createBackupService(memService, { source: 'test-source' });
    const backupPath = backupService.backup('test');
    
    assert(backupPath !== null, 'Backup was created');
    assert(existsSync(backupPath!), 'Backup file exists');
    assert(backupPath!.endsWith('.json'), 'Has .json extension');
    assert(backupPath!.includes('smem_test_'), 'Filename includes label');
    
    const backupData = JSON.parse(readFileSync(backupPath!, 'utf-8'));
    assertBackupMetadata(backupData, 3, 'test-source');
    
    // ==========================================
    // Test 2: Memory Format Validation
    // ==========================================
    console.log('\n[TEST 2] Backup content matches export format');
    
    backupData.memories.forEach((m: any, i: number) => assertMemoryFormat(m, `Memory ${i + 1}`));
    
    const memory1 = backupData.memories.find((m: any) => m.content === 'Test memory 1');
    assert(memory1 !== undefined, 'Found Test memory 1');
    assert(memory1.tags.includes('test') && memory1.tags.includes('backup'), 'Memory 1 has expected tags');
    
    // ==========================================
    // Test 3: Throttle Logic (Data-Driven)
    // ==========================================
    console.log('\n[TEST 3] Backup throttling (data-driven)');
    
    const originalDateNow = Date.now;
    
    for (const tc of THROTTLE_TEST_CASES) {
      const service = createBackupService(memService, { autoBackupInterval: tc.interval });
      service.backup('throttle-test');
      
      const baseTime = Date.now();
      Date.now = () => baseTime + (tc.elapsedMinutes * 60 * 1000);
      
      const result = service.shouldBackup();
      assert(result === tc.shouldTrigger, `${tc.name}: shouldBackup=${tc.shouldTrigger}`);
      
      Date.now = originalDateNow;
    }
    
    // ==========================================
    // Test 4: Backup Cleanup (Max Backups)
    // ==========================================
    console.log('\n[TEST 4] Backup cleanup (keeps max backups)');
    
    const cleanupService = createBackupService(memService, { maxBackups: 3 });
    
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      cleanupService.backup(`cleanup${i}`);
    }
    
    const backupCount = getBackupFiles().length;
    assert(backupCount <= 3, `Cleanup kept max 3 backups (found ${backupCount})`);
    
    // ==========================================
    // Test 5: Utility Methods
    // ==========================================
    console.log('\n[TEST 5] Utility methods (getBackupCount, getTimeSinceLastBackup)');
    
    const utilService = createBackupService(memService);
    utilService.backup('util-test');
    
    const count = utilService.getBackupCount();
    assert(count === getBackupFiles().length, `getBackupCount matches file count (${count})`);
    
    const timeSince = utilService.getTimeSinceLastBackup();
    assert(timeSince >= 0 && timeSince < 1, `Time since backup is ~0 minutes (${timeSince})`);
    
    // ==========================================
    // Test 6: MemoryService Integration
    // ==========================================
    console.log('\n[TEST 6] Integration with MemoryService (via env vars)');
    
    cleanup();
    mkdirSync(BACKUP_DIR, { recursive: true });
    
    process.env.MEMORY_DB = TEST_DB;
    process.env.MEMORY_BACKUP_PATH = BACKUP_DIR;
    process.env.MEMORY_BACKUP_INTERVAL = '0';
    process.env.MEMORY_BACKUP_SOURCE = 'integration-test';
    clearConfigCache();
    
    const integratedService = new MemoryService(TEST_DB);
    integratedService.initialize();
    integratedService.store('Integration test memory', ['integration']);
    
    const integrationBackups = getBackupFiles();
    assert(integrationBackups.length > 0, 'MemoryService triggered backup on store');
    
    const latestBackup = integrationBackups.sort().reverse()[0];
    const intContent = JSON.parse(readFileSync(join(BACKUP_DIR, latestBackup), 'utf-8'));
    assert(intContent.source === 'integration-test', 'Source from env var is used');
    assert(intContent.totalMemories >= 1, 'Backup contains stored memory');
    
    const stats = integratedService.stats();
    assert(stats.backupEnabled === true, 'Stats show backup enabled');
    assert(stats.backupPath === BACKUP_DIR, 'Stats show correct backup path');
    
    integratedService.close();
    
    // Cleanup env vars
    delete process.env.MEMORY_DB;
    delete process.env.MEMORY_BACKUP_PATH;
    delete process.env.MEMORY_BACKUP_INTERVAL;
    delete process.env.MEMORY_BACKUP_SOURCE;
    
    memService.close();
    
    console.log('\n[SUCCESS] All Backup Service tests passed!\n');
    
  } catch (error) {
    console.error('\n[ERROR] Test failed:', error);
    throw error;
  } finally {
    cleanup();
    console.log('[CLEANUP] Cleanup completed\n');
  }
}

// Run tests if executed directly
if (process.argv[1]?.endsWith('backup-test.js')) {
  runTests()
    .then(() => {
      console.log('[DONE] Backup Service test suite completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[FAILED] Test suite failed:', error);
      process.exit(1);
    });
}

export { runTests };
