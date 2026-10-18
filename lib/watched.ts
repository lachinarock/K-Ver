import * as SQLite from 'expo-sqlite';

import type { MediaType, WatchedTitle } from '@/lib/types';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function database() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('kver.db').then(async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS watched (
          media_type TEXT NOT NULL,
          tmdb_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          poster_path TEXT,
          year TEXT,
          rating INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (media_type, tmdb_id)
        );
      `);
      return db;
    });
  }
  return databasePromise;
}

type WatchedRow = {
  media_type: MediaType;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  year: string;
  rating: number;
  updated_at: string;
};

function toTitle(row: WatchedRow): WatchedTitle {
  return {
    mediaType: row.media_type,
    tmdbId: row.tmdb_id,
    title: row.title,
    posterPath: row.poster_path,
    year: row.year,
    rating: row.rating,
    updatedAt: row.updated_at,
  };
}

export async function listWatched() {
  const db = await database();
  const rows = await db.getAllAsync<WatchedRow>(
    'SELECT * FROM watched ORDER BY updated_at DESC',
  );
  return rows.map(toTitle);
}

export async function saveWatched(input: Omit<WatchedTitle, 'updatedAt'>) {
  const db = await database();
  const updatedAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO watched (media_type, tmdb_id, title, poster_path, year, rating, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(media_type, tmdb_id) DO UPDATE SET
       title = excluded.title,
       poster_path = excluded.poster_path,
       year = excluded.year,
       rating = excluded.rating,
       updated_at = excluded.updated_at`,
    input.mediaType,
    input.tmdbId,
    input.title,
    input.posterPath,
    input.year,
    input.rating,
    updatedAt,
  );
  return { ...input, updatedAt };
}

export async function removeWatched(mediaType: MediaType, tmdbId: number) {
  const db = await database();
  await db.runAsync('DELETE FROM watched WHERE media_type = ? AND tmdb_id = ?', mediaType, tmdbId);
}
