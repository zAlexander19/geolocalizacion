// Migration script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './src/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runMigration = async () => {
  const sqlFilePath = path.join(__dirname, 'create_ratings_table.sql');
  const sqlQuery = fs.readFileSync(sqlFilePath, 'utf8');

  try {
    console.log('Running ratings migration...');
    await pool.query(sqlQuery);
    console.log('✅ Ratings table created or verified successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating ratings table:', err);
    process.exit(1);
  }
};

runMigration();
