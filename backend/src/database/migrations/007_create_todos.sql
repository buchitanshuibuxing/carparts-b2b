CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  content VARCHAR(500) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  is_done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_is_done ON todos(is_done);
