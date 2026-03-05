import paramiko
import sys

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')

script = '''
import { pool } from './src/config/database.js';

async function fix() {
    try {
        console.log("Updating NULLs...");
        await pool.query("UPDATE audit_logs SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
        console.log("Altering default...");
        await pool.query("ALTER TABLE audit_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP");
        console.log("Done!");
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
fix();
'''

with open('apps/api/tmp_fix.js', 'w') as f:
    f.write(script)

sftp = client.open_sftp()
sftp.put('apps/api/tmp_fix.js', '/home/geocampus/geocampus/apps/api/tmp_fix.js')
sftp.close()

stdin, stdout, stderr = client.exec_command('cd /home/geocampus/geocampus/apps/api && node tmp_fix.js')
print('STDOUT:', stdout.read().decode())
print('STDERR:', stderr.read().decode())
client.close()