"""
Script de despliegue del backend (API) al servidor .205
Sube todos los archivos fuente de apps/api/src/ y reinicia PM2.

Uso:
    python scripts/ssh_deploy_api.py
    python scripts/ssh_deploy_api.py --full   (incluye package.json + npm install)
"""

import paramiko
import os
import sys
import time

# ─── Configuración ──────────────────────────────────────────────────────────
HOST     = '172.19.82.205'
PORT     = 2200
USER     = 'geocampus'
PASSWORD = 'Thi4$f3kLgiT'

LOCAL_API_ROOT  = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apps', 'api'))
REMOTE_API_ROOT = '/home/geocampus/geocampus/apps/api'

# Directorios de código fuente que se sincronizan siempre
SRC_DIRS = ['src']

# Archivos raíz que se sincronizan siempre
SRC_FILES = ['ecosystem.config.cjs']

# ─── Helpers ────────────────────────────────────────────────────────────────
def upload_directory(sftp, local_dir, remote_dir):
    """Sube un directorio completo de forma recursiva."""
    try:
        sftp.mkdir(remote_dir)
    except OSError:
        pass  # Ya existe

    count = 0
    for item in sorted(os.listdir(local_dir)):
        local_path  = os.path.join(local_dir, item)
        remote_path = remote_dir + '/' + item

        if os.path.isdir(local_path):
            count += upload_directory(sftp, local_path, remote_path)
        else:
            sftp.put(local_path, remote_path)
            print(f'    ✓ {remote_path}')
            count += 1
    return count


def run(client, cmd, show=True):
    """Ejecuta un comando y devuelve stdout + stderr."""
    _, out, err = client.exec_command(cmd)
    stdout = out.read().decode('utf-8', errors='replace').strip()
    stderr = err.read().decode('utf-8', errors='replace').strip()
    if show and stdout:
        print(stdout)
    if show and stderr:
        print('  STDERR:', stderr)
    return stdout, stderr


# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    full_deploy = '--full' in sys.argv

    print('=' * 55)
    print('  DEPLOY BACKEND → servidor .205 (api-geocampus)')
    print('=' * 55)

    # 1. Conectar
    print(f'\n[1/4] Conectando a {HOST}:{PORT}...')
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD)
    print('      Conexión establecida ✓')

    # 2. Subir archivos fuente
    print(f'\n[2/4] Subiendo código fuente...')
    sftp = client.open_sftp()
    total = 0

    for d in SRC_DIRS:
        local  = os.path.join(LOCAL_API_ROOT, d)
        remote = f'{REMOTE_API_ROOT}/{d}'
        print(f'  Directorio: {d}/')
        total += upload_directory(sftp, local, remote)

    for f in SRC_FILES:
        local  = os.path.join(LOCAL_API_ROOT, f)
        remote = f'{REMOTE_API_ROOT}/{f}'
        if os.path.exists(local):
            sftp.put(local, remote)
            print(f'    ✓ {remote}')
            total += 1

    # Deploy completo: también sube package.json e instala dependencias
    if full_deploy:
        pkg_local  = os.path.join(LOCAL_API_ROOT, 'package.json')
        pkg_remote = f'{REMOTE_API_ROOT}/package.json'
        if os.path.exists(pkg_local):
            sftp.put(pkg_local, pkg_remote)
            print(f'    ✓ package.json')
            total += 1

    sftp.close()
    print(f'\n  Total archivos subidos: {total}')

    # 3. npm install (solo con --full)
    if full_deploy:
        print(f'\n[3/4] Instalando dependencias (npm install)...')
        stdout, _ = run(client, f'cd {REMOTE_API_ROOT} && npm install --production 2>&1', show=True)
        print('      npm install completado ✓')
    else:
        print(f'\n[3/4] Omitiendo npm install (usa --full para instalar dependencias)')

    # 4. Reiniciar PM2
    print(f'\n[4/4] Reiniciando PM2...')
    run(client, 'pm2 restart api-geocampus --update-env', show=True)
    time.sleep(3)

    # Verificar estado
    stdout, _ = run(client, 'pm2 jlist', show=False)
    import json
    try:
        procs = json.loads(stdout)
        for p in procs:
            if p.get('name') == 'api-geocampus':
                status  = p['pm2_env']['status']
                uptime  = p['pm2_env'].get('pm_uptime', 0)
                restarts = p['pm2_env'].get('restart_time', 0)
                pid     = p['pid']
                symbol  = '✓' if status == 'online' else '✗'
                print(f'  {symbol} api-geocampus → {status} | PID: {pid} | reinicios: {restarts}')
    except Exception:
        run(client, 'pm2 list', show=True)

    # Test rápido de la API
    stdout, _ = run(client, 'curl -s -o /dev/null -w "%{http_code}" -H "Origin: https://geocampus.unap.cl" http://127.0.0.1:4000/buildings', show=False)
    ok = '✓' if stdout.strip() == '200' else '✗'
    print(f'  {ok} GET /buildings → HTTP {stdout.strip()}')

    client.close()

    print('\n' + '=' * 55)
    print('  ✅ Deploy backend completado.')
    print('=' * 55)


if __name__ == '__main__':
    main()
