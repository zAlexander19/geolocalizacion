-- Migración: Agregar tabla audit_logs para historial de cambios
-- Fecha: 2025-12-12

-- Crear tabla audit_logs si no existe
CREATE TABLE IF NOT EXISTS audit_logs (
    id_audit SERIAL PRIMARY KEY,
    user_email VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('crear', 'modificar', 'eliminar')),
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('edificio', 'piso', 'sala', 'baño', 'facultad')),
    entity_id VARCHAR(50) NOT NULL,
    entity_name VARCHAR(255),
    changes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Verificar que la tabla fue creada
SELECT 'Tabla audit_logs creada exitosamente' as resultado;
