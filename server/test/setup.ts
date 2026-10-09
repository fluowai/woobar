import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-0123456789abcdef0123456789abcdef';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'woobar-test-'));
process.env.DATABASE_PATH = path.join(dir, 'test.db');
process.env.BACKUP_INTERVAL_HOURS = '0';

process.on('exit', () => {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
});
