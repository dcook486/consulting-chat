import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "../../data/chat.db");

export function createDb(dbPath?: string): Database.Database {
  const resolvedPath = dbPath || DB_PATH;
  const dir = path.dirname(resolvedPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS consulting_leads (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      business_type TEXT,
      pain_points TEXT DEFAULT '[]',
      interested_services TEXT DEFAULT '[]',
      intent_level TEXT DEFAULT 'low',
      scheduled_call INTEGER DEFAULT 0,
      calendly_event_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_interaction TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      started_at TEXT DEFAULT (datetime('now')),
      last_message_at TEXT DEFAULT (datetime('now')),
      messages_count INTEGER DEFAULT 0,
      lead_id TEXT REFERENCES consulting_leads(id),
      intent_level TEXT DEFAULT 'low',
      referrer TEXT,
      user_agent TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_lead ON chat_sessions(lead_id);
    CREATE INDEX IF NOT EXISTS idx_leads_intent ON consulting_leads(intent_level);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON chat_sessions(started_at);
  `);
}

// Run directly
if (process.argv[1]?.includes("migrate")) {
  const db = createDb();
  migrate(db);
  console.log("Migration complete");
  db.close();
}
