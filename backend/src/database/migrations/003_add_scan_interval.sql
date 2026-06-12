-- Add scan interval fields to import_sources table
ALTER TABLE import_sources
ADD COLUMN IF NOT EXISTS scan_interval INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scan_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN import_sources.scan_interval IS 'Auto-scan interval in minutes, 0 = disabled';
COMMENT ON COLUMN import_sources.last_scan_at IS 'Last time auto-scan was performed';
