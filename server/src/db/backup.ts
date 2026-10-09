import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { logger } from '../lib/logger.js';

const DB_PATH = process.env.DATABASE_PATH || path.resolve(import.meta.dirname, '../../data/woobar.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), 'backups');
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP || 14));

function cleanup() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('woobar-') && f.endsWith('.db'))
    .sort();
  const excess = files.length - KEEP;
  for (const file of files.slice(0, excess)) {
    fs.unlinkSync(path.join(BACKUP_DIR, file));
  }
}

export async function runBackup(): Promise<string> {
  if (!fs.existsSync(DB_PATH)) throw new Error(`Banco não encontrado: ${DB_PATH}`);
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const dest = path.join(BACKUP_DIR, `woobar-${stamp}.db`);
  const source = new Database(DB_PATH, { readonly: true });
  try {
    await source.backup(dest);
  } finally {
    source.close();
  }
  cleanup();
  return dest;
}

export function scheduleBackups(): NodeJS.Timeout | null {
  const hours = Number(process.env.BACKUP_INTERVAL_HOURS || 0);
  if (!(hours > 0)) return null;
  const timer = setInterval(() => {
    runBackup()
      .then(dest => logger.info('Backup do banco criado', { path: dest }))
      .catch(err => logger.error('Backup do banco falhou', { error: err?.message || String(err) }));
  }, hours * 60 * 60 * 1000);
  timer.unref?.();
  logger.info('Backups agendados', { interval_hours: hours, dir: BACKUP_DIR, keep: KEEP });
  return timer;
}

const invoked = process.argv[1] ? path.basename(process.argv[1]).replace(/\.[^.]+$/, '') : '';
if (invoked === 'backup') {
  runBackup()
    .then(dest => console.log(`Backup criado: ${dest}`))
    .catch(err => { console.error(`Backup falhou: ${err?.message || err}`); process.exit(1); });
}
