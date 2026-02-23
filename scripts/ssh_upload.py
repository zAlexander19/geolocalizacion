import paramiko
import os

host = "172.19.82.206"
port = 2200
user = "geocampus"
password = "Thi4$f3kLgiT"
local_dist = r"apps\web\dist"
remote_tmp = "/tmp/geocampus_deploy"
remote_web = "/var/www/geocampus.unap.cl/public_html"


def sudo_cmd(client, cmd, pw):
    # Comillas simples en echo para que $ no se interprete en bash
    full_cmd = "echo '" + pw + "' | sudo -S bash -c '" + cmd + "' 2>&1"
    stdin, stdout, stderr = client.exec_command(full_cmd)
    return stdout.read().decode()


def upload_dir(sftp, local_path, remote_path):
    try:
        sftp.stat(remote_path)
    except FileNotFoundError:
        sftp.mkdir(remote_path)
    for item in os.listdir(local_path):
        local_item = os.path.join(local_path, item)
        remote_item = remote_path + "/" + item
        if os.path.isdir(local_item):
            upload_dir(sftp, local_item, remote_item)
        else:
            print(f"  Subiendo: {item}")
            sftp.put(local_item, remote_item)


print("Conectando al servidor 172.19.82.206...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password)
print("Conectado!")

print("\nPreparando carpeta temporal...")
sudo_cmd(client, f"rm -rf {remote_tmp} && mkdir -p {remote_tmp}/assets && chown -R {user}:{user} {remote_tmp}", password)

sftp = client.open_sftp()
print(f"\nSubiendo archivos a {remote_tmp}...")
upload_dir(sftp, local_dist, remote_tmp)
sftp.close()

print(f"\nMoviendo archivos al destino {remote_web}...")
out = sudo_cmd(client, f"rm -rf {remote_web}/* && cp -r {remote_tmp}/* {remote_web}/ && chmod -R 755 {remote_web} && chown -R nginx:nginx {remote_web}", password)
print(out or "OK")

print("\nTesteando Nginx...")
out = sudo_cmd(client, "nginx -t", password)
print(out)

print("Recargando Nginx...")
out = sudo_cmd(client, "systemctl reload nginx", password)
print(out or "Nginx recargado.")

print("\nArchivos en destino:")
stdin2, stdout2, stderr2 = client.exec_command(f"ls -la {remote_web}")
print(stdout2.read().decode())

client.close()
print("\n> Despliegue completado.")