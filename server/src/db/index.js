import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
   throw new Error('DATABASE_URL is required to connect to the database.');
}

// Disable prepared statements for Supabase connection poolers
const client = postgres(databaseUrl, { prepare: false });

export const db = drizzle({ client, schema });
