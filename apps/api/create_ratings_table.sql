CREATE TABLE IF NOT EXISTS ratings (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL, -- e.g., 'building', 'faculty'
  entity_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,         -- assuming users are logged in
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_entity ON ratings (entity_type, entity_id);
