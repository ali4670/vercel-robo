-- ============================================
-- ASSIGNMENT SUBMISSION & LESSON ACCESS CONTROL
-- Migration: assignment-access-control.sql
-- ============================================

-- 1. Add assignment fields to lectures
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS assignment_required BOOLEAN DEFAULT false;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS assignment_description TEXT;

-- 2. Extend lecture_task_submissions with status tracking
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- 3. Assignment overrides (manual moderator unlock)
CREATE TABLE IF NOT EXISTS assignment_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, lecture_id)
);

-- 4. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. Function: check if student can access next lecture (assignment gate)
CREATE OR REPLACE FUNCTION can_access_next_lecture(p_current_lecture_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_next_lecture_id UUID;
    v_next_assignment_required BOOLEAN;
    v_submission_status TEXT;
    v_has_override BOOLEAN;
BEGIN
    -- Find the next lecture in sequence
    SELECT l2.id INTO v_next_lecture_id
    FROM lectures l1
    JOIN lectures l2 ON l1.level_id = l2.level_id AND l2.slot_number = l1.slot_number + 1
    WHERE l1.id = p_current_lecture_id;

    IF v_next_lecture_id IS NULL THEN
        RETURN TRUE; -- No next lecture, allow completion
    END IF;

    -- Check if the next lecture requires an assignment
    SELECT assignment_required INTO v_next_assignment_required
    FROM lectures WHERE id = v_next_lecture_id;

    IF NOT v_next_assignment_required THEN
        RETURN TRUE; -- No assignment required for next lecture
    END IF;

    -- Check if there's a moderator override
    SELECT EXISTS(
        SELECT 1 FROM assignment_overrides
        WHERE student_id = p_student_id AND lecture_id = v_next_lecture_id
    ) INTO v_has_override;

    IF v_has_override THEN
        RETURN TRUE; -- Moderator granted access
    END IF;

    -- Check submission status for the CURRENT lecture (assignment must be approved)
    SELECT status INTO v_submission_status
    FROM lecture_task_submissions
    WHERE student_id = p_student_id AND lecture_id = p_current_lecture_id;

    RETURN v_submission_status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function: approve assignment and unlock next
CREATE OR REPLACE FUNCTION approve_assignment(
    p_submission_id UUID,
    p_moderator_id UUID,
    p_feedback TEXT DEFAULT NULL,
    p_grade INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_student_id UUID;
    v_lecture_id UUID;
BEGIN
    UPDATE lecture_task_submissions
    SET status = 'approved',
        feedback = p_feedback,
        grade = p_grade,
        graded_by = p_moderator_id,
        graded_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_submission_id
    RETURNING student_id, lecture_id INTO v_student_id, v_lecture_id;

    -- Create notification for student
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        v_student_id,
        'Assignment Approved',
        'Your assignment has been approved! You can now access the next lesson.',
        'success',
        '/lecture/' || v_lecture_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function: reject assignment
CREATE OR REPLACE FUNCTION reject_assignment(
    p_submission_id UUID,
    p_moderator_id UUID,
    p_feedback TEXT DEFAULT NULL,
    p_grade INTEGER DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_student_id UUID;
    v_lecture_id UUID;
BEGIN
    UPDATE lecture_task_submissions
    SET status = 'rejected',
        feedback = p_feedback,
        grade = p_grade,
        graded_by = p_moderator_id,
        graded_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_submission_id
    RETURNING student_id, lecture_id INTO v_student_id, v_lecture_id;

    -- Create notification for student
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        v_student_id,
        'Assignment Needs Revision',
        COALESCE(p_feedback, 'Your assignment needs revision. Please review the feedback and resubmit.'),
        'warning',
        '/lecture/' || v_lecture_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: manual override (grant access)
CREATE OR REPLACE FUNCTION grant_lecture_access(
    p_student_id UUID,
    p_lecture_id UUID,
    p_moderator_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO assignment_overrides (student_id, lecture_id, moderator_id, reason)
    VALUES (p_student_id, p_lecture_id, p_moderator_id, p_reason)
    ON CONFLICT (student_id, lecture_id) DO UPDATE SET
        moderator_id = p_moderator_id,
        reason = p_reason,
        created_at = timezone('utc'::text, now());

    -- Create notification for student
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
        p_student_id,
        'Access Granted',
        COALESCE(p_reason, 'A moderator has granted you access to the next lesson.'),
        'info',
        '/lecture/' || p_lecture_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON lecture_task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_student_lecture ON lecture_task_submissions(student_id, lecture_id);
CREATE INDEX IF NOT EXISTS idx_assignment_overrides_student ON assignment_overrides(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_lectures_assignment ON lectures(assignment_required) WHERE assignment_required = true;

-- 10. RLS Policies

-- assignment_overrides
ALTER TABLE assignment_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Moderators can manage overrides" ON assignment_overrides
    FOR ALL USING (is_moderator());

CREATE POLICY "Students can view own overrides" ON assignment_overrides
    FOR SELECT USING (auth.uid() = student_id);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- 11. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE lecture_task_submissions;
