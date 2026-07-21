-- Cleanup task submissions older than 7 days
-- Run this in Supabase SQL Editor
-- Requires pg_cron extension: CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION cleanup_old_task_submissions()
RETURNS void AS $$
BEGIN
  DELETE FROM lecture_task_submissions
  WHERE submitted_at < NOW() - INTERVAL '7 days'
    AND grade IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT cron.schedule(
  'cleanup-task-submissions',
  '0 3 * * *',
  $$SELECT cleanup_old_task_submissions()$$
);
