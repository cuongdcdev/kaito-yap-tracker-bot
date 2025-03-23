import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite'; // Note this import from 'sqlite', not 'sqlite3'
import { logger } from './utils/logger';
import { YapsScore } from './services/kaitoApi';

const DB_DIR = path.resolve(__dirname, '../db');
const DB_PATH = path.resolve(DB_DIR, 'kaito_bot.sqlite');

// Ensure the db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let db: Database | null = null;

export async function initDatabase(): Promise<void> {
  try {
    // Enable verbose mode for debugging
    sqlite3.verbose();
    
    // Open database with the sqlite package (Promise-based wrapper)
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });
    
    logger.info('Database connection opened');
    
    // Create tables if they don't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS tracked_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        twitter_username TEXT NOT NULL,
        last_score_data TEXT NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, twitter_username)
      );
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

export async function getDb(): Promise<Database> {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

// Add a user to be tracked
export async function trackUser(chatId: number, twitterUsername: string, scoreData: YapsScore): Promise<void> {
  const database = await getDb();
  await database.run(
    'INSERT OR REPLACE INTO tracked_users (chat_id, twitter_username, last_score_data) VALUES (?, ?, ?)',
    [chatId, twitterUsername.toLowerCase(), JSON.stringify(scoreData)]
  );
}

// Remove a tracked user
export async function untrackUser(chatId: number, twitterUsername: string): Promise<boolean> {
  const database = await getDb();
  const result = await database.run(
    'DELETE FROM tracked_users WHERE chat_id = ? AND twitter_username = ?',
    [chatId, twitterUsername.toLowerCase()]
  );
  return result.changes && result.changes > 0 ? true : false;
}

// Get all tracked users with their complete score data
export async function getAllTrackedUsers(): Promise<{
  chat_id: number;
  twitter_username: string;
  last_score_data: YapsScore;
}[]> {
  const database = await getDb();
  const rows = await database.all('SELECT chat_id, twitter_username, last_score_data FROM tracked_users');
  
  return rows.map(row => ({
    chat_id: row.chat_id,
    twitter_username: row.twitter_username,
    last_score_data: JSON.parse(row.last_score_data)
  }));
}

// Get tracked users for specific chat
export async function getTrackedUsersForChat(chatId: number): Promise<{
  twitter_username: string;
  last_score_data: YapsScore;
}[]> {
  const database = await getDb();
  const rows = await database.all(
    'SELECT twitter_username, last_score_data FROM tracked_users WHERE chat_id = ?',
    [chatId]
  );
  
  return rows.map(row => ({
    twitter_username: row.twitter_username,
    last_score_data: JSON.parse(row.last_score_data)
  }));
}

// Update user score data
export async function updateUserScore(chatId: number, twitterUsername: string, scoreData: YapsScore): Promise<void> {
  const database = await getDb();
  await database.run(
    'UPDATE tracked_users SET last_score_data = ?, last_updated = CURRENT_TIMESTAMP WHERE chat_id = ? AND twitter_username = ?',
    [JSON.stringify(scoreData), chatId, twitterUsername.toLowerCase()]
  );
}