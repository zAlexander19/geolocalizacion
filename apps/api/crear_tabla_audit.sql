-- Script rápido para crear tabla audit_logs
-- Ejecutar este script en tu base de datos PostgreSQL

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

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
