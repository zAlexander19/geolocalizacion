import paramiko
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')

script = '''
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
'''

with open('apps/api/tmp_ins2.js', 'w') as f:
    f.write(script)

sftp = client.open_sftp()
sftp.put('apps/api/tmp_ins2.js', '/home/geocampus/geocampus/apps/api/tmp_ins2.js')
sftp.close()

stdin, stdout, stderr = client.exec_command('cd /home/geocampus/geocampus/apps/api && node tmp_ins2.js')
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
client.close()