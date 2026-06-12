-- Add import progress tracking to import_sources table
ALTER TABLE import_sources
ADD COLUMN IF NOT EXISTS import_progress JSONB;

COMMENT ON COLUMN import_sources.import_progress IS 'Real-time import progress: {imported, skipped, errors, total, currentFile}';
