import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('172.19.82.205', port=2200, username='geocampus', password='Thi4$f3kLgiT')
env_addition = """
CLOUDINARY_CLOUD_NAME=dnj3c8vj7
CLOUDINARY_API_KEY=648666548773836
CLOUDINARY_API_SECRET=Eoo_wYfVz_z4XgJ8Lq7xLz_Xz3g
JWT_SECRET=tu_secreto_para_jwt_production_key_muy_seguro
"""
command = f"echo '{env_addition.strip()}' >> /home/geocampus/geocampus/apps/api/.env"
_, out, err = client.exec_command(command)
print("OUT:", out.read().decode())
print("ERR:", err.read().decode())
client.close()
