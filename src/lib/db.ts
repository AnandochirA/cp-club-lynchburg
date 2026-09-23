import { neon } from '@neondatabase/serverless';

/**
 * Any Postgres connection string works — Neon, Supabase, Railway, or a local
 * database. The driver speaks HTTP to Neon and plain Postgres elsewhere.
 */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes('user:password@host')) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and paste your connection string.',
    );
  }
  return neon(url);
}

export type SignupRow = {
  id: number;
  name: string;
  email: string;
  class_year: string | null;
  major: string | null;
  experience: string;
  source: string;
  created_at: string;
};
