import Database from 'better-sqlite3';
import path from 'node:path';
import seed from '@/data/seed.json';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export type RequestRow = {
  id: number;
  title: string;
  requester: string;
  status: RequestStatus;
  createdAt: string; // ISO string
};

let db: Database.Database | null = null;

function getDb() {
  if (db) return db;
  db = new Database(path.join(process.cwd(), 'data', 'app.db'));
  db.exec(`CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    requester TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL
  )`);
  const count = (db.prepare('SELECT COUNT(*) AS n FROM requests').get() as { n: number }).n;
  if (count === 0) {
    const insert = db.prepare('INSERT INTO requests (title, requester, status, createdAt) VALUES (?, ?, ?, ?)');
    for (const row of seed) insert.run(row.title, row.requester, row.status, row.createdAt);
  }
  return db;
}

export async function listRequests(): Promise<RequestRow[]> {
  return getDb().prepare('SELECT * FROM requests ORDER BY createdAt DESC').all() as RequestRow[];
}

export async function createRequest(input: { title: string; requester: string }): Promise<RequestRow> {
  const createdAt = new Date().toISOString();
  const result = getDb()
    .prepare('INSERT INTO requests (title, requester, status, createdAt) VALUES (?, ?, ?, ?)')
    .run(input.title, input.requester, 'pending', createdAt);
  return { id: Number(result.lastInsertRowid), ...input, status: 'pending', createdAt };
}

export async function updateStatus(id: number, status: RequestStatus): Promise<void> {
  getDb().prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, id);
}
