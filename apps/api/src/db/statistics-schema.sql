-- Tabla para registrar estadísticas de consultas
DROP TABLE IF EXISTS search_logs CASCADE;

CREATE TABLE search_logs (
    id_log SERIAL PRIMARY KEY,
    search_type VARCHAR(50) NOT NULL, -- 'sala', 'edificio', 'bano', 'facultad', 'todo'
    search_query VARCHAR(255),
    result_type VARCHAR(50), -- tipo del resultado clickeado
    result_id INTEGER, -- ID del resultado clickeado
    result_name VARCHAR(255), -- nombre del resultado
    user_location_lat DECIMAL(10, 8),
    user_location_lng DECIMAL(11, 8),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento de consultas
CREATE INDEX idx_search_logs_type ON search_logs(search_type);
CREATE INDEX idx_search_logs_result_type ON search_logs(result_type);
CREATE INDEX idx_search_logs_result_id ON search_logs(result_id);
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at);

-- Vista para estadísticas rápidas
CREATE OR REPLACE VIEW statistics_summary AS
SELECT 
    COUNT(*) as total_searches,
    COUNT(DISTINCT DATE(created_at)) as days_with_activity,
    search_type,
    COUNT(*) as searches_by_type
FROM search_logs
GROUP BY search_type;
