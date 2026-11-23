import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ROLES_SQL } from '../lib/roles.js';
import { logger } from '../lib/logger.js';

const DATA_DIR = path.resolve(import.meta.dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, 'woobar.db');
const db: DatabaseType = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS establishments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      address TEXT,
      phone TEXT,
      config_json TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN (${ROLES_SQL})) NOT NULL DEFAULT 'attendant',
      status TEXT CHECK(status IN ('active','inactive')) DEFAULT 'active',
      avatar TEXT,
      current_location_lat REAL,
      current_location_lng REAL,
      is_available INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      category_id TEXT REFERENCES categories(id),
      webhook_secret TEXT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image TEXT,
      active INTEGER DEFAULT 1,
      ncm TEXT DEFAULT '22030000',
      cfop TEXT DEFAULT '5102',
      csosn TEXT DEFAULT '102',
      origin INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'UN',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      seats INTEGER DEFAULT 4,
      status TEXT CHECK(status IN ('free','occupied','reserved','dirty')) DEFAULT 'free',
      x_position REAL DEFAULT 0,
      y_position REAL DEFAULT 0,
      shape TEXT DEFAULT 'square'
    );

    CREATE TABLE IF NOT EXISTS table_orders (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      table_id TEXT REFERENCES tables(id),
      customer_name TEXT,
      status TEXT CHECK(status IN ('open','closed','cancelled')) DEFAULT 'open',
      total REAL DEFAULT 0,
      payment_method TEXT,
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS table_order_items (
      id TEXT PRIMARY KEY,
      table_order_id TEXT REFERENCES table_orders(id),
      product_id TEXT REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      notes TEXT,
      status TEXT CHECK(status IN ('pending','preparing','ready','served','cancelled')) DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_address TEXT,
      items_json TEXT,
      total REAL NOT NULL,
      status TEXT CHECK(status IN ('pending','preparing','ready','delivering','delivered','cancelled')) DEFAULT 'pending',
      courier_id TEXT REFERENCES users(id),
      location_lat REAL,
      location_lng REAL,
      payment_method TEXT,
      channel TEXT DEFAULT 'website',
      external_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_messages (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      sender TEXT CHECK(sender IN ('customer','store')) NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      location TEXT,
      image TEXT,
      description TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_tickets (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES events(id),
      name TEXT NOT NULL,
      price REAL NOT NULL,
      available INTEGER DEFAULT 0,
      sold INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ticket_sales (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES events(id),
      ticket_type_id TEXT REFERENCES event_tickets(id),
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      buyer_name TEXT,
      buyer_email TEXT,
      code TEXT UNIQUE NOT NULL,
      status TEXT CHECK(status IN ('valid','used','cancelled')) DEFAULT 'valid',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bar_tokens (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      item_name TEXT NOT NULL,
      price REAL NOT NULL,
      code TEXT UNIQUE NOT NULL,
      status TEXT CHECK(status IN ('valid','used')) DEFAULT 'valid',
      type TEXT CHECK(type IN ('token','ticket')) DEFAULT 'token',
      payment_method TEXT,
      expires_at TEXT,
      used_at TEXT,
      used_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cover_charge (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      type TEXT CHECK(type IN ('entry','exit')) NOT NULL,
      amount REAL DEFAULT 0,
      method TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cover_config (
      establishment_id TEXT PRIMARY KEY REFERENCES establishments(id),
      price REAL DEFAULT 25.00,
      capacity INTEGER DEFAULT 250,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'un',
      current_stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 0,
      cost_price REAL DEFAULT 0,
      category TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
      id TEXT PRIMARY KEY,
      item_id TEXT REFERENCES inventory_items(id),
      type TEXT CHECK(type IN ('in','out')) NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL,
      reason TEXT,
      reference_type TEXT,
      reference_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      product_id TEXT REFERENCES products(id),
      name TEXT NOT NULL,
      yield_amount REAL DEFAULT 1,
      yield_unit TEXT DEFAULT 'un',
      instructions TEXT
    );

    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY,
      recipe_id TEXT REFERENCES recipes(id),
      inventory_item_id TEXT REFERENCES inventory_items(id),
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS cash_registers (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      user_id TEXT REFERENCES users(id),
      opened_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT,
      opening_balance REAL DEFAULT 0,
      closing_balance REAL,
      total_cash REAL DEFAULT 0,
      total_card REAL DEFAULT 0,
      total_pix REAL DEFAULT 0,
      total_debit REAL DEFAULT 0,
      total_credit REAL DEFAULT 0,
      notes TEXT,
      status TEXT CHECK(status IN ('open','closed')) DEFAULT 'open'
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      total_visits INTEGER DEFAULT 1,
      total_spent REAL DEFAULT 0,
      last_visit TEXT DEFAULT (datetime('now')),
      birth_date TEXT,
      notes TEXT,
      loyalty_points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('ifood','uber','rappi','food99','whatsapp','website','facebook','instagram')) NOT NULL,
      api_key TEXT,
      webhook_url TEXT,
      webhook_secret TEXT,
      active INTEGER DEFAULT 1,
      config_json TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS whatsapp_connections (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL REFERENCES establishments(id),
      display_name TEXT NOT NULL,
      session_name TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'waha',
      base_url TEXT NOT NULL,
      api_key TEXT,
      category_id TEXT REFERENCES categories(id),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(establishment_id, session_name)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_contacts (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL REFERENCES establishments(id),
      connection_id TEXT NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      display_name TEXT NOT NULL,
      push_name TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(connection_id, phone)
    );

    CREATE TABLE IF NOT EXISTS whatsapp_messages (
      id TEXT PRIMARY KEY,
      establishment_id TEXT NOT NULL REFERENCES establishments(id),
      connection_id TEXT NOT NULL REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
      chat_id TEXT NOT NULL,
      direction TEXT CHECK(direction IN ('inbound','outbound')) NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      text TEXT,
      media_url TEXT,
      media_mime TEXT,
      media_filename TEXT,
      push_name TEXT,
      raw_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(connection_id, id)
    );

    CREATE TABLE IF NOT EXISTS channel_orders (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id),
      establishment_id TEXT REFERENCES establishments(id),
      external_id TEXT,
      order_json TEXT,
      status TEXT CHECK(status IN ('received','pending','accepted','preparing','ready','delivering','delivered','cancelled')) DEFAULT 'received',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_orders_external ON channel_orders(channel_id, external_id);

    CREATE TABLE IF NOT EXISTS channel_event_log (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id),
      event_type TEXT NOT NULL,
      event_external_id TEXT,
      action TEXT NOT NULL DEFAULT 'poll',
      details_json TEXT,
      processed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS menu_sync (
      id TEXT PRIMARY KEY,
      channel_id TEXT REFERENCES channels(id),
      product_id TEXT REFERENCES products(id),
      external_id TEXT,
      external_data_json TEXT,
      synced_at TEXT DEFAULT (datetime('now')),
      status TEXT DEFAULT 'synced'
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS establishment_settings (
      establishment_id TEXT PRIMARY KEY REFERENCES establishments(id),
      name TEXT,
      logo_url TEXT,
      primary_color TEXT DEFAULT '#f97316',
      tax_rate REAL DEFAULT 0,
      service_fee REAL DEFAULT 0,
      delivery_fee REAL DEFAULT 5.00,
      free_delivery_min REAL DEFAULT 50.00,
      opening_hours TEXT DEFAULT '{}',
      print_ip TEXT,
      print_port INTEGER DEFAULT 9100,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      name TEXT NOT NULL,
      channel TEXT CHECK(channel IN ('whatsapp','email','sms')) NOT NULL DEFAULT 'whatsapp',
      segment TEXT CHECK(segment IN ('all','inactive','vip','birthday')) NOT NULL DEFAULT 'all',
      message TEXT NOT NULL,
      status TEXT CHECK(status IN ('draft','scheduled','sent','paused')) NOT NULL DEFAULT 'draft',
      scheduled_at TEXT,
      audience_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      code TEXT NOT NULL,
      description TEXT,
      discount_type TEXT CHECK(discount_type IN ('percentage','fixed')) NOT NULL DEFAULT 'percentage',
      discount_value REAL NOT NULL,
      min_order REAL DEFAULT 0,
      cashback_percent REAL DEFAULT 0,
      usage_limit INTEGER,
      used_count INTEGER DEFAULT 0,
      valid_until TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(establishment_id, code)
    );

    CREATE TABLE IF NOT EXISTS printer_configs (
      establishment_id TEXT PRIMARY KEY REFERENCES establishments(id),
      name TEXT DEFAULT 'Impressora principal',
      host TEXT,
      port INTEGER DEFAULT 9100,
      paper_width INTEGER DEFAULT 80,
      auto_print_tokens INTEGER DEFAULT 1,
      auto_print_tickets INTEGER DEFAULT 1,
      enabled INTEGER DEFAULT 0,
      delivery_mode TEXT DEFAULT 'agent',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS printer_agents (
      establishment_id TEXT PRIMARY KEY REFERENCES establishments(id),
      name TEXT DEFAULT 'Agente local',
      token_hash TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      last_seen_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      type TEXT NOT NULL,
      reference_id TEXT,
      payload_json TEXT NOT NULL,
      status TEXT CHECK(status IN ('pending','printing','printed','failed')) DEFAULT 'pending',
      attempts INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      printed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS fiscal_settings (
      establishment_id TEXT PRIMARY KEY REFERENCES establishments(id),
      environment INTEGER DEFAULT 2,
      company_name TEXT,
      fantasy_name TEXT,
      cnpj TEXT,
      ie TEXT,
      crt INTEGER DEFAULT 1,
      uf TEXT DEFAULT 'SP',
      ibge_code INTEGER DEFAULT 3550308,
      city TEXT DEFAULT 'São Paulo',
      street TEXT,
      number TEXT,
      complement TEXT,
      neighborhood TEXT,
      zip_code TEXT,
      phone TEXT,
      csc TEXT,
      csc_id TEXT,
      cert_pfx_base64 TEXT,
      cert_password TEXT,
      serie INTEGER DEFAULT 1,
      last_number INTEGER DEFAULT 0,
      auto_emit_on_closing INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fiscal_invoices (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      order_id TEXT REFERENCES orders(id),
      table_order_id TEXT REFERENCES table_orders(id),
      serie INTEGER NOT NULL,
      number INTEGER NOT NULL,
      status TEXT CHECK(status IN ('autorizada','cancelada','rejeitada','denegada','erro')) NOT NULL,
      ch_nfe TEXT,
      protocol TEXT,
      xml TEXT,
      qrcode_url TEXT,
      c_stat TEXT,
      motivo TEXT,
      total REAL NOT NULL,
      items_json TEXT,
      payments_json TEXT,
      customer_cpf TEXT,
      customer_name TEXT,
      environment INTEGER DEFAULT 2,
      cancelled_at TEXT,
      cancel_reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payment_settings (
      establishment_id TEXT PRIMARY KEY REFERENCES establishments(id),
      provider TEXT NOT NULL DEFAULT 'mercadopago',
      access_token TEXT,
      public_key TEXT,
      webhook_secret TEXT,
      pix_key TEXT,
      auto_approve_test INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      order_id TEXT REFERENCES orders(id),
      table_order_id TEXT REFERENCES table_orders(id),
      provider TEXT NOT NULL DEFAULT 'mercadopago',
      external_id TEXT,
      status TEXT CHECK(status IN ('pending','approved','rejected','cancelled','refunded')) DEFAULT 'pending',
      method TEXT NOT NULL DEFAULT 'pix',
      amount REAL NOT NULL,
      qr_code TEXT,
      qr_code_base64 TEXT,
      ticket_url TEXT,
      payer_email TEXT,
      payer_name TEXT,
      payer_cpf TEXT,
      paid_at TEXT,
      expires_at TEXT,
      raw_payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_payments_external ON payments(provider, external_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_table ON payments(table_order_id);

    CREATE TABLE IF NOT EXISTS saas_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      price_monthly REAL NOT NULL DEFAULT 0,
      price_yearly REAL NOT NULL DEFAULT 0,
      max_tables INTEGER DEFAULT 15,
      max_users INTEGER DEFAULT 5,
      max_products INTEGER DEFAULT 100,
      features_json TEXT NOT NULL DEFAULT '[]',
      is_popular INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saas_subscriptions (
      id TEXT PRIMARY KEY,
      establishment_id TEXT UNIQUE REFERENCES establishments(id),
      plan_id TEXT REFERENCES saas_plans(id),
      status TEXT CHECK(status IN ('trial', 'active', 'past_due', 'canceled')) DEFAULT 'trial',
      trial_ends_at TEXT,
      current_period_end TEXT,
      billing_cycle TEXT CHECK(billing_cycle IN ('monthly', 'yearly')) DEFAULT 'monthly',
      payment_method TEXT DEFAULT 'pix',
      gateway_customer_id TEXT,
      gateway_subscription_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_saas_sub_est ON saas_subscriptions(establishment_id);
    CREATE INDEX IF NOT EXISTS idx_saas_sub_status ON saas_subscriptions(status);

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      establishment_id TEXT REFERENCES establishments(id),
      requester_user_id TEXT REFERENCES users(id),
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT CHECK(status IN ('open','in_progress','waiting_customer','resolved','closed')) DEFAULT 'open',
      priority TEXT CHECK(priority IN ('low','normal','high','urgent')) DEFAULT 'normal',
      assigned_to TEXT REFERENCES users(id),
      last_reply_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status, priority, updated_at);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_establishment ON support_tickets(establishment_id, updated_at);

    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      body TEXT NOT NULL,
      internal INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  initSaasDefaults();
  const printerColumns = db.prepare("PRAGMA table_info(printer_configs)").all() as Array<{ name: string }>;
  if (!printerColumns.some(column => column.name === 'delivery_mode')) {
    db.exec("ALTER TABLE printer_configs ADD COLUMN delivery_mode TEXT DEFAULT 'agent'");
  }

  const productColumns = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
  if (!productColumns.some(c => c.name === 'ncm')) {
    db.exec("ALTER TABLE products ADD COLUMN ncm TEXT DEFAULT '22030000'");
  }
  if (!productColumns.some(c => c.name === 'cfop')) {
    db.exec("ALTER TABLE products ADD COLUMN cfop TEXT DEFAULT '5102'");
  }
  if (!productColumns.some(c => c.name === 'csosn')) {
    db.exec("ALTER TABLE products ADD COLUMN csosn TEXT DEFAULT '102'");
  }
  if (!productColumns.some(c => c.name === 'origin')) {
    db.exec("ALTER TABLE products ADD COLUMN origin INTEGER DEFAULT 0");
  }
  if (!productColumns.some(c => c.name === 'unit')) {
    db.exec("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'UN'");
  }

  const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  if (!orderColumns.some(c => c.name === 'payment_status')) {
    db.exec("ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
  }

  const tableOrderColumns = db.prepare("PRAGMA table_info(table_orders)").all() as Array<{ name: string }>;
  if (!tableOrderColumns.some(c => c.name === 'payment_status')) {
    db.exec("ALTER TABLE table_orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'");
  }

  const barTokenColumns = db.prepare("PRAGMA table_info(bar_tokens)").all() as Array<{ name: string }>;
  if (!barTokenColumns.some(c => c.name === 'expires_at')) db.exec("ALTER TABLE bar_tokens ADD COLUMN expires_at TEXT");
  if (!barTokenColumns.some(c => c.name === 'used_at')) db.exec("ALTER TABLE bar_tokens ADD COLUMN used_at TEXT");
  if (!barTokenColumns.some(c => c.name === 'used_by')) db.exec("ALTER TABLE bar_tokens ADD COLUMN used_by TEXT");

  const whatsappConnectionColumns = db.prepare("PRAGMA table_info(whatsapp_connections)").all() as Array<{ name: string }>;
  if (whatsappConnectionColumns.length && !whatsappConnectionColumns.some(c => c.name === 'webhook_secret')) db.exec("ALTER TABLE whatsapp_connections ADD COLUMN webhook_secret TEXT");

  migrateConstraints();
  migrateTenantSettings();
}

/**
 * Migra establishment_settings/cover_config do PK antigo 'default' (linha única
 * compartilhada por todos os tenants) para PK = establishment_id.
 */
function migrateTenantSettings() {
  for (const table of ['establishment_settings', 'cover_config']) {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!cols.some(c => c.name === 'id')) continue; // já migrado

    const rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
    const createSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(table) as any)?.sql
      ?.replace(/id TEXT PRIMARY KEY DEFAULT 'default',\s*/i, '');

    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        db.exec(`DROP TABLE ${table}`);
        db.exec(createSql);
        for (const row of rows) {
          if (!row.establishment_id) continue;
          const fields = Object.keys(row).filter(k => k !== 'id');
          const placeholders = fields.map(() => '?').join(',');
          db.prepare(`INSERT OR REPLACE INTO ${table} (establishment_id, ${fields.join(',')}) VALUES (?,${placeholders})`)
            .run(row.establishment_id, ...fields.map(f => row[f]));
        }
      })();
      logger.info(`Migração ${table}: PK → establishment_id`);
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }
}

function initSaasDefaults() {
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO saas_plans (id, name, slug, description, price_monthly, price_yearly, max_tables, max_users, max_products, features_json, is_popular, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertPlan.run(
    'plan-starter',
    'Starter PDV',
    'starter',
    'Ideal para lanchonetes e bares pequenos que precisam de PDV, Mesas e Cardápio Digital.',
    97.00,
    970.00,
    15,
    5,
    100,
    JSON.stringify(['pos', 'tables', 'menu_qr', 'reports']),
    0
  );

  insertPlan.run(
    'plan-pro',
    'Pro Bar & KDS',
    'pro',
    'Completo para choperias, restaurantes e bares com cozinha, fichas e delivery.',
    197.00,
    1970.00,
    50,
    15,
    300,
    JSON.stringify(['pos', 'tables', 'menu_qr', 'reports', 'kds', 'tokens', 'inventory', 'whatsapp', 'delivery']),
    1
  );

  insertPlan.run(
    'plan-enterprise',
    'Enterprise & Fiscal',
    'enterprise',
    'Para grandes casas noturnas, baladas, eventos, totem de autoatendimento e emissão fiscal NFC-e.',
    349.00,
    3490.00,
    999,
    99,
    999,
    JSON.stringify(['pos', 'tables', 'menu_qr', 'reports', 'kds', 'tokens', 'inventory', 'whatsapp', 'delivery', 'fiscal', 'kiosk', 'events', 'channels']),
    0
  );

  // Vincular estabelecimentos existentes sem assinatura ao plano enterprise ativo
  const ests = db.prepare('SELECT id FROM establishments').all() as Array<{ id: string }>;
  const checkSub = db.prepare('SELECT id FROM saas_subscriptions WHERE establishment_id = ?');
  const insertSub = db.prepare(`
    INSERT INTO saas_subscriptions (id, establishment_id, plan_id, status, trial_ends_at, current_period_end, billing_cycle)
    VALUES (?, ?, 'plan-enterprise', 'active', datetime('now', '+365 days'), datetime('now', '+365 days'), 'monthly')
  `);

  for (const est of ests) {
    if (!checkSub.get(est.id)) {
      insertSub.run(`sub-${est.id}`, est.id);
    }
  }
}

const CHECK_REWRITES: Record<string, (sql: string) => string> = {
  users: sql =>
    sql.replace(
      /CHECK\s*\(\s*role\s+IN\s*\([^)]*\)\s*\)/i,
      `CHECK(role IN (${ROLES_SQL}))`
    ),
  channels: sql =>
    sql.replace(
      /CHECK\s*\(\s*type\s+IN\s*\([^)]*\)\s*\)/i,
      "CHECK(type IN ('ifood','uber','rappi','food99','whatsapp','website','facebook','instagram'))"
    ),
  channel_orders: sql =>
    sql.replace(
      /CHECK\s*\(\s*status\s+IN\s*\([^)]*\)\s*\)/i,
      "CHECK(status IN ('received','pending','accepted','preparing','ready','delivering','delivered','cancelled'))"
    ),
};

function migrateConstraints() {
  for (const [table, rewrite] of Object.entries(CHECK_REWRITES)) {
    const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?").get(table) as
      | { sql: string }
      | undefined;
    if (!row?.sql) continue;

    const newSql = rewrite(row.sql);
    if (newSql === row.sql) continue;

    rebuildTable(table, newSql);
  }
}

function rebuildTable(table: string, newSql: string) {
  const columns = (db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>).map(c => c.name);
  const backup = `${table}_migrate_backup`;

  db.pragma('foreign_keys = OFF');
  try {
    db.transaction(() => {
      db.exec(`DROP TABLE IF EXISTS ${backup}`);
      db.exec(`CREATE TABLE ${backup} AS SELECT * FROM ${table}`);
      db.exec(`DROP TABLE ${table}`);
      db.exec(newSql);
      db.exec(`INSERT INTO ${table} (${columns.join(', ')}) SELECT ${columns.join(', ')} FROM ${backup}`);
      db.exec(`DROP TABLE ${backup}`);
      if (table === 'channel_orders') {
        db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_orders_external ON channel_orders(channel_id, external_id)');
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
  }
}

export default db;
