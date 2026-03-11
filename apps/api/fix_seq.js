const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:AqN65xZ31@localhost:5433/geocampus' });
pool.query(SELECT setval(pg_get_serial_sequence('search_logs', 'id_log'), coalesce(max(id_log), 0) + 1, false) FROM search_logs;).then(r => { console.log(r.rows); process.exit(0); }).catch(e=>console.error(e));
