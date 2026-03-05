import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')

# Remove the bad lines
command = "sed -i '/CLOUDINARY_/d' /home/geocampus/geocampus/apps/api/.env"
client.exec_command(command)

env_addition = """
CLOUDINARY_URL=cloudinary://356127438626531:oys59lAJrxPlcz07mxrcV2Z2qAE@ddcdbo9ec
"""
command = f"echo '{env_addition.strip()}' >> /home/geocampus/geocampus/apps/api/.env"
_, out, err = client.exec_command(command)
print("OUT:", out.read().decode())
print("ERR:", err.read().decode())
client.close()
