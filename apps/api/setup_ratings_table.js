import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

const pool = new pg.Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'geocampus',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function migrateRatings() {
  try {
    console.log('Creando tabla app_ratings...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_ratings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
        description TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Tabla app_ratings creada exitosamente.');
  } catch (error) {
    console.error('Error creando la tabla:', error);
  } finally {
    pool.end();
  }
}

migrateRatings();
