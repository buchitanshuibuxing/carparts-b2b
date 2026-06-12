CREATE TABLE IF NOT EXISTS import_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    protocol VARCHAR(20) NOT NULL,
    url TEXT,
    username VARCHAR(255) DEFAULT '',
    password VARCHAR(255) DEFAULT '',
    local_mount_path TEXT,
    remote_path TEXT DEFAULT '/',
    auto_classify BOOLEAN DEFAULT true,
    folder_mapping JSONB DEFAULT '{}',
    last_sync_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'idle',
    error_message TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
