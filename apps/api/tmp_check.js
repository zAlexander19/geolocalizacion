
import { pool } from './src/config/database.js';

async function fix() {
    try {
        console.log('Updating NULLs...');
        await pool.query('UPDATE audit_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
        
        await pool.query('ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP');
        console.log('Done!');
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
fix();
