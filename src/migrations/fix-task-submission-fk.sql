-- Fix: Migrate lecture_task_submissions.lecture_id from old `lectures` IDs to `lecture_templates` IDs,
-- then add the FK.

-- Step 1: Check what orphaned lecture_ids exist
-- Run this first to see what needs migrating:
-- SELECT DISTINCT lts.lecture_id
-- FROM lecture_task_submissions lts
-- LEFT JOIN lecture_templates lt ON lt.id = lts.lecture_id
-- WHERE lt.id IS NULL;

-- Step 2: If old `lectures` table still exists, migrate by matching title + slot_number
UPDATE lecture_task_submissions lts
SET lecture_id = lt.id
FROM lecture_templates lt
JOIN lectures old ON old.title = lt.title AND old.slot_number = lt.slot_number
WHERE lts.lecture_id = old.id
  AND lt.id IS NOT NULL;

-- Step 3: If titles don't match, try matching by level position + slot
-- (only if step 2 didn't catch everything)

-- Step 4: Drop any remaining orphaned submissions (ones that can't be mapped)
DELETE FROM lecture_task_submissions lts
WHERE NOT EXISTS (
    SELECT 1 FROM lecture_templates lt WHERE lt.id = lts.lecture_id
);

-- Step 5: Now safely add the FK
ALTER TABLE lecture_task_submissions DROP CONSTRAINT IF EXISTS lecture_task_submissions_lecture_id_fkey;
ALTER TABLE lecture_task_submissions DROP CONSTRAINT IF EXISTS fk_lecture_task_submissions_lecture;
ALTER TABLE lecture_task_submissions
  ADD CONSTRAINT lecture_task_submissions_lecture_id_fkey
  FOREIGN KEY (lecture_id) REFERENCES lecture_templates(id) ON DELETE CASCADE;
