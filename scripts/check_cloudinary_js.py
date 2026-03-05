import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')
_, out, _ = client.exec_command('cat /home/geocampus/geocampus/apps/api/src/config/cloudinary.js')
print(out.read().decode())
client.close()