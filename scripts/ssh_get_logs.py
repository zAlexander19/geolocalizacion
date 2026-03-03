import paramiko, sys
sys.stdout.reconfigure(encoding='utf-8')
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
pwd = 'Thi4$f3kLgiT'
client.connect('geocampus.unap.cl', port=2200, username='geocampus', password=pwd)
stdin, stdout, stderr = client.exec_command('pm2 logs geocampus-api --lines 50 --nocolor 2>&1 | tail -60')
print(stdout.read().decode('utf-8', errors='replace'))
client.close()
