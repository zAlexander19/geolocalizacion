import paramiko
import json

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')

_, out, err = client.exec_command("pm2 jlist")
apps = json.loads(out.read().decode())
for app in apps:
    if app['name'] == 'api-geocampus':
        env = app.get('pm2_env', {})
        print("CLOUDINARY_URL:", env.get('CLOUDINARY_URL'))
        print("CLOUDINARY_API_KEY:", env.get('CLOUDINARY_API_KEY'))
client.close()