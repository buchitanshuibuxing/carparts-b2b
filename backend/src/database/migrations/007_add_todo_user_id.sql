ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
