-- Tabla de Usuarios para Sistema de Autenticación
-- PostgreSQL

-- Drop table if exists
DROP TABLE IF EXISTS usuarios CASCADE;

-- Table: usuarios
CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'admin_secundario' CHECK (rol IN ('admin_primario', 'admin_secundario')),
    estado BOOLEAN DEFAULT TRUE,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_estado ON usuarios(estado);

-- Trigger for updating timestamps
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario administrador por defecto
-- Contraseña por defecto: admin123 (debe cambiarse después)
-- Hash generado con bcrypt (10 rounds)
INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES 
('Administrador Principal', 'admin@unap.cl', '$2b$10$rZvV3qJkH.K1pXKzJ6xGC.xvX4qH3X8QK5YJ3P8jZH4JK5YJ3P8jZ', 'admin_primario');

-- Nota: El hash anterior es un ejemplo. Deberás generar uno real con:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('admin123', 10);

COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema con roles de administrador';
COMMENT ON COLUMN usuarios.rol IS 'admin_primario: puede gestionar usuarios y cambiar contraseñas. admin_secundario: puede gestionar contenido pero no usuarios';
COMMENT ON COLUMN usuarios.password_hash IS 'Hash bcrypt de la contraseña del usuario';
COMMENT ON COLUMN usuarios.ultimo_acceso IS 'Timestamp del último inicio de sesión exitoso';
