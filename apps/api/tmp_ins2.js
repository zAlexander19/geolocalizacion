
import { pool } from './src/config/database.js';
async function testIns() {
    try {
        const query = "INSERT INTO audit_logs (id_usuario, user_email, action, entity_type, entity_id, entity_name) VALUES (1, 'test', 'crear', 'sala', '999', 'test') RETURNING created_at";
        const r = await pool.query(query);
        console.log("INSERT RESULT:", r.rows[0]);
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
testIns();
