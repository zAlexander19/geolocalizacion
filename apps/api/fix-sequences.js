import { pool } from './src/config/database.js';

async function fixSequences() {
  const tables = [
    { table: 'buildings', id: 'id_edificio' },
    { table: 'floors', id: 'id_piso' },
    { table: 'rooms', id: 'id_sala' },
    { table: 'bathrooms', id: 'id_bano' },
    { table: 'totems', id: 'id_totem' },
    { table: 'usuarios', id: 'id_usuario' }
  ];

  for (const { table, id } of tables) {
    try {
      const res = await pool.query(`SELECT pg_get_serial_sequence('${table}', '${id}') as seq`);
      if (res.rows[0] && res.rows[0].seq) {
        const seq = res.rows[0].seq;
        console.log(`Fixing sequence for ${table}... (${seq})`);
        await pool.query(`SELECT setval('${seq}', COALESCE((SELECT MAX(${id}) FROM ${table}), 1), true)`);
      } else {
        console.log(`Fixing sequence for ${table} (manual)...`);
        await pool.query(`SELECT setval('${table}_${id}_seq', COALESCE((SELECT MAX(${id}) FROM ${table}), 1), true)`);
      }
      console.log(`Fixed sequence for ${table}.`);
    } catch (e) {
      console.error(`Error fixing sequence for ${table}: `, e.message);
    }
  }
  
  try {
     console.log('Deleting duplicate building asdad');
     await pool.query(`DELETE FROM buildings WHERE nombre_edificio = 'asdad'`);
  } catch(e) {
     console.error('Error deleting:', e.message);
  }

  process.exit(0);
}

fixSequences();