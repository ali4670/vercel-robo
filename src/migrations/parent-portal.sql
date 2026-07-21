-- =============================================================
-- PARENT PORTAL — Complete Student Monitoring & Communication
-- Migration: parent-portal.sql
-- =============================================================

-- =============================================================
-- 1. NEW TABLES
-- =============================================================

-- 1a. Student Activity Log — tracks logins, lesson views, study time
CREATE TABLE IF NOT EXISTS student_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'lesson_view', 'lesson_complete',
        'quiz_attempt', 'assignment_submit', 'assignment_view',
        'exam_start', 'exam_complete', 'message_sent', 'file_download'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1b. Study Sessions — tracks time-based attendance
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 0,
    lectures_viewed UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

-- 1c. Calendar Events — exams, deadlines, meetings, milestones
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'assignment_due', 'exam', 'live_class', 'parent_meeting',
        'milestone', 'badge_earned', 'level_unlocked', 'custom'
    )),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    is_completed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1d. Student Files — portfolio, certificates, reports
CREATE TABLE IF NOT EXISTS student_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN (
        'submission', 'certificate', 'report', 'resource', 'moderator_attachment', 'portfolio'
    )),
    description TEXT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1e. Parent-Moderator Conversation Threads
CREATE TABLE IF NOT EXISTS parent_moderator_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    subject TEXT,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(parent_id, moderator_id, student_id)
);

-- 1f. Parent-Moderator Messages (threaded)
CREATE TABLE IF NOT EXISTS parent_moderator_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID REFERENCES parent_moderator_threads(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'voice')),
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1g. Grade History — tracks grade changes over time
CREATE TABLE IF NOT EXISTS grade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    grade_type TEXT NOT NULL CHECK (grade_type IN ('assignment', 'quiz', 'exam')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    max_score INTEGER DEFAULT 100,
    feedback TEXT,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 1h. Learning Milestones — badges, streaks, achievements
CREATE TABLE IF NOT EXISTS learning_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN (
        'badge', 'certificate', 'streak', 'level_complete',
        'perfect_score', 'first_assignment', 'consistency'
    )),
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    metadata JSONB DEFAULT '{}',
    earned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =============================================================
-- 2. ALTER EXISTING TABLES
-- =============================================================

-- Add age to profiles (optional)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Add grade/graded columns to lecture_task_submissions if not exist
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES profiles(id);
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- =============================================================
-- 3. RPC FUNCTIONS
-- =============================================================

-- 3a. Get parent's student summary stats
CREATE OR REPLACE FUNCTION get_parent_student_summary(p_student_id UUID)
RETURNS TABLE (
    total_lectures BIGINT,
    completed_lectures BIGINT,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    pending_assignments BIGINT,
    overdue_assignments BIGINT,
    approved_assignments BIGINT,
    rejected_assignments BIGINT,
    average_grade NUMERIC,
    total_exam_attempts BIGINT,
    average_exam_score NUMERIC,
    total_study_hours NUMERIC,
    last_activity TIMESTAMPTZ,
    current_streak INTEGER,
    accessible_levels BIGINT,
    total_levels BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM lectures l
         JOIN levels lv ON l.level_id = lv.id
         JOIN level_access la ON la.level_id = lv.id
         WHERE la.user_id = p_student_id)::BIGINT,
        (SELECT COUNT(*) FROM student_progress sp
         WHERE sp.student_id = p_student_id)::BIGINT,
        (SELECT COUNT(*) FROM lectures l
         WHERE l.assignment_required = true)::BIGINT,
        (SELECT COUNT(*) FROM lecture_task_submissions lts
         WHERE lts.student_id = p_student_id AND lts.status = 'approved')::BIGINT,
        (SELECT COUNT(*) FROM lecture_task_submissions lts
         WHERE lts.student_id = p_student_id AND lts.status = 'pending')::BIGINT,
        (SELECT COUNT(*) FROM lecture_task_submissions lts
         WHERE lts.student_id = p_student_id AND lts.status = 'rejected')::BIGINT,
        (SELECT COUNT(*) FROM lecture_task_submissions lts
         WHERE lts.student_id = p_student_id AND lts.status = 'approved')::BIGINT,
        (SELECT COUNT(*) FROM lecture_task_submissions lts
         WHERE lts.student_id = p_student_id AND lts.status = 'rejected')::BIGINT,
        (SELECT ROUND(AVG(lts.grade), 1) FROM lecture_task_submissions lts
         WHERE lts.student_id = p_student_id AND lts.grade IS NOT NULL),
        (SELECT COUNT(*) FROM exam_submissions es
         WHERE es.student_id = p_student_id)::BIGINT,
        (SELECT ROUND(AVG(es.total_grade), 1) FROM exam_submissions es
         WHERE es.student_id = p_student_id AND es.total_grade IS NOT NULL),
        (SELECT ROUND(COALESCE(SUM(ss.duration_minutes), 0) / 60.0, 1)
         FROM study_sessions ss WHERE ss.student_id = p_student_id),
        (SELECT MAX(ss.ended_at) FROM study_sessions ss
         WHERE ss.student_id = p_student_id),
        (SELECT COUNT(DISTINCT ss2.started_at::date)
         FROM study_sessions ss2
         WHERE ss2.student_id = p_student_id
           AND ss2.started_at >= CURRENT_DATE - INTERVAL '30 days'
           AND ss2.started_at::date >= (
               SELECT COALESCE(MAX(ss3.ended_at::date), CURRENT_DATE - 7)
               FROM study_sessions ss3
               WHERE ss3.student_id = p_student_id
           ))::INTEGER,
        (SELECT COUNT(*) FROM level_access la
         WHERE la.user_id = p_student_id)::BIGINT,
        (SELECT COUNT(*) FROM levels WHERE is_published = true)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3b. Get course progress breakdown for a student
CREATE OR REPLACE FUNCTION get_student_course_progress(p_student_id UUID)
RETURNS TABLE (
    level_id UUID,
    level_title TEXT,
    level_order INTEGER,
    total_lectures BIGINT,
    completed_lectures BIGINT,
    progress_pct NUMERIC,
    latest_activity TIMESTAMPTZ,
    has_access BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lv.id,
        lv.title,
        lv.level_order,
        (SELECT COUNT(*) FROM lectures l WHERE l.level_id = lv.id AND l.is_live IS NOT FALSE)::BIGINT,
        (SELECT COUNT(*) FROM lectures l
         JOIN student_progress sp ON l.id = sp.lecture_id
         WHERE l.level_id = lv.id AND sp.student_id = p_student_id)::BIGINT,
        CASE
            WHEN (SELECT COUNT(*) FROM lectures l WHERE l.level_id = lv.id AND l.is_live IS NOT FALSE) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(*)::NUMERIC FROM lectures l
                 JOIN student_progress sp ON l.id = sp.lecture_id
                 WHERE l.level_id = lv.id AND sp.student_id = p_student_id)
                * 100.0
                / (SELECT COUNT(*) FROM lectures l WHERE l.level_id = lv.id AND l.is_live IS NOT FALSE)
            , 1)
        END,
        (SELECT MAX(sp.completed_at) FROM student_progress sp
         JOIN lectures l ON sp.lecture_id = l.id
         WHERE l.level_id = lv.id AND sp.student_id = p_student_id),
        EXISTS(SELECT 1 FROM level_access la WHERE la.user_id = p_student_id AND la.level_id = lv.id)
    FROM levels lv
    WHERE lv.is_published = true
    ORDER BY lv.level_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3c. Get detailed lesson progress for a level
CREATE OR REPLACE FUNCTION get_student_lesson_detail(p_student_id UUID, p_level_id UUID)
RETURNS TABLE (
    lecture_id UUID,
    lecture_title TEXT,
    slot_number INTEGER,
    is_completed BOOLEAN,
    completed_at TIMESTAMPTZ,
    assignment_required BOOLEAN,
    assignment_status TEXT,
    assignment_grade INTEGER,
    assignment_feedback TEXT,
    quiz_passed BOOLEAN,
    is_locked BOOLEAN,
    lock_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.slot_number,
        EXISTS(SELECT 1 FROM student_progress sp WHERE sp.student_id = p_student_id AND sp.lecture_id = l.id),
        (SELECT sp.completed_at FROM student_progress sp WHERE sp.student_id = p_student_id AND sp.lecture_id = l.id),
        COALESCE(l.assignment_required, false),
        COALESCE((SELECT lts.status FROM lecture_task_submissions lts WHERE lts.student_id = p_student_id AND lts.lecture_id = l.id), 'not_submitted'),
        (SELECT lts.grade FROM lecture_task_submissions lts WHERE lts.student_id = p_student_id AND lts.lecture_id = l.id),
        (SELECT lts.feedback FROM lecture_task_submissions lts WHERE lts.student_id = p_student_id AND lts.lecture_id = l.id),
        EXISTS(SELECT 1 FROM quiz_attempts qa WHERE qa.student_id = p_student_id AND qa.lecture_id = l.id AND qa.is_passed = true),
        NOT can_access_lecture(l.id),
        CASE
            WHEN NOT has_level_access(l.level_id) THEN 'Level not unlocked'
            WHEN NOT can_access_lecture(l.id) THEN 'Previous lesson incomplete or drip period'
            ELSE NULL
        END
    FROM lectures l
    WHERE l.level_id = p_level_id
    ORDER BY l.slot_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3d. Get all assignments for a student with full detail
CREATE OR REPLACE FUNCTION get_student_assignments(p_student_id UUID)
RETURNS TABLE (
    submission_id UUID,
    lecture_id UUID,
    lecture_title TEXT,
    level_title TEXT,
    level_order INTEGER,
    slot_number INTEGER,
    image_url TEXT,
    file_url TEXT,
    status TEXT,
    feedback TEXT,
    grade INTEGER,
    graded_by_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    graded_at TIMESTAMPTZ,
    assignment_description TEXT,
    submission_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lts.id,
        l.id,
        l.title,
        lv.title,
        lv.level_order,
        l.slot_number,
        lts.image_url,
        lts.file_url,
        COALESCE(lts.status, 'pending'),
        lts.feedback,
        lts.grade,
        (SELECT p.username FROM profiles p WHERE p.id = lts.graded_by),
        lts.created_at,
        lts.updated_at,
        lts.graded_at,
        l.description,
        (SELECT COUNT(*) FROM lecture_task_submissions lts2
         WHERE lts2.student_id = p_student_id AND lts2.lecture_id = l.id)
    FROM lecture_task_submissions lts
    JOIN lectures l ON lts.lecture_id = l.id
    JOIN levels lv ON l.level_id = lv.id
    WHERE lts.student_id = p_student_id
    ORDER BY lts.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3e. Get all moderator feedback for a student
CREATE OR REPLACE FUNCTION get_student_feedback(p_student_id UUID)
RETURNS TABLE (
    feedback_id UUID,
    source TEXT,
    lecture_title TEXT,
    level_title TEXT,
    feedback_text TEXT,
    grade INTEGER,
    category TEXT,
    created_by_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    -- Assignment feedback
    SELECT
        lts.id,
        'assignment'::TEXT,
        l.title,
        lv.title,
        lts.feedback,
        lts.grade,
        'assignment_review'::TEXT,
        COALESCE((SELECT p.username FROM profiles p WHERE p.id = lts.graded_by), 'System'),
        lts.updated_at
    FROM lecture_task_submissions lts
    JOIN lectures l ON lts.lecture_id = l.id
    JOIN levels lv ON l.level_id = lv.id
    WHERE lts.student_id = p_student_id AND lts.feedback IS NOT NULL

    UNION ALL

    -- Exam feedback
    SELECT
        es.id,
        'exam'::TEXT,
        l.title,
        lv.title,
        es.moderator_feedback,
        es.total_grade,
        'exam_review'::TEXT,
        COALESCE((SELECT p.username FROM profiles p WHERE p.id = es.graded_by), 'System'),
        es.graded_at
    FROM exam_submissions es
    JOIN lectures l ON es.lecture_id = l.id
    JOIN levels lv ON l.level_id = lv.id
    WHERE es.student_id = p_student_id AND es.moderator_feedback IS NOT NULL

    UNION ALL

    -- Moderator notes
    SELECT
        mn.id,
        'note'::TEXT,
        'General'::TEXT,
        'General'::TEXT,
        mn.content,
        NULL,
        'moderator_note'::TEXT,
        COALESCE((SELECT p.username FROM profiles p WHERE p.id = mn.moderator_id), 'System'),
        mn.created_at
    FROM moderator_notes mn
    WHERE mn.student_id = p_student_id

    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3f. Get student activity summary
CREATE OR REPLACE FUNCTION get_student_activity(p_student_id UUID)
RETURNS TABLE (
    total_logins BIGINT,
    logins_this_week BIGINT,
    logins_this_month BIGINT,
    total_study_hours NUMERIC,
    study_hours_this_week NUMERIC,
    study_hours_this_month NUMERIC,
    daily_activity JSONB,
    weekly_activity JSONB,
    last_login TIMESTAMPTZ,
    total_lesson_views BIGINT,
    total_submissions BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM student_activity_log sal
         WHERE sal.student_id = p_student_id AND sal.activity_type = 'login')::BIGINT,
        (SELECT COUNT(*) FROM student_activity_log sal
         WHERE sal.student_id = p_student_id AND sal.activity_type = 'login'
           AND sal.created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT,
        (SELECT COUNT(*) FROM student_activity_log sal
         WHERE sal.student_id = p_student_id AND sal.activity_type = 'login'
           AND sal.created_at >= CURRENT_DATE - INTERVAL '30 days')::BIGINT,
        (SELECT ROUND(COALESCE(SUM(ss.duration_minutes), 0) / 60.0, 1)
         FROM study_sessions ss WHERE ss.student_id = p_student_id),
        (SELECT ROUND(COALESCE(SUM(ss.duration_minutes), 0) / 60.0, 1)
         FROM study_sessions ss WHERE ss.student_id = p_student_id
           AND ss.started_at >= CURRENT_DATE - INTERVAL '7 days'),
        (SELECT ROUND(COALESCE(SUM(ss.duration_minutes), 0) / 60.0, 1)
         FROM study_sessions ss WHERE ss.student_id = p_student_id
           AND ss.started_at >= CURRENT_DATE - INTERVAL '30 days'),
        (SELECT json_agg(json_build_object(
            'date', d.day, 'minutes', COALESCE(day_mins.minutes, 0)
        ) ORDER BY d.day)
         FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, '1 day') AS d(day)
         LEFT JOIN (
             SELECT ss.started_at::date AS day, SUM(ss.duration_minutes) AS minutes
             FROM study_sessions ss
             WHERE ss.student_id = p_student_id AND ss.started_at >= CURRENT_DATE - INTERVAL '13 days'
             GROUP BY ss.started_at::date
         ) day_mins ON d.day = day_mins.day),
        (SELECT json_agg(json_build_object(
            'week', w.week_start, 'minutes', COALESCE(day_mins.minutes, 0)
         ) ORDER BY w.week_start)
         FROM generate_series(CURRENT_DATE - INTERVAL '11 weeks'::interval, CURRENT_DATE, '7 days') AS w(week_start)
         LEFT JOIN (
             SELECT date_trunc('week', ss.started_at)::date AS week, SUM(ss.duration_minutes) AS minutes
             FROM study_sessions ss
             WHERE ss.student_id = p_student_id AND ss.started_at >= CURRENT_DATE - INTERVAL '11 weeks'
             GROUP BY date_trunc('week', ss.started_at)::date
         ) day_mins ON w.week_start = day_mins.week),
        (SELECT MAX(ss.ended_at) FROM study_sessions ss WHERE ss.student_id = p_student_id),
        (SELECT COUNT(*) FROM student_activity_log sal
         WHERE sal.student_id = p_student_id AND sal.activity_type = 'lesson_view')::BIGINT,
        (SELECT COUNT(*) FROM student_activity_log sal
         WHERE sal.student_id = p_student_id AND sal.activity_type = 'assignment_submit')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3g. Get student calendar events
CREATE OR REPLACE FUNCTION get_student_calendar(p_student_id UUID, p_from DATE, p_to DATE)
RETURNS TABLE (
    event_id UUID,
    title TEXT,
    description TEXT,
    event_type TEXT,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_completed BOOLEAN,
    lecture_id UUID,
    level_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id,
        ce.title,
        ce.description,
        ce.event_type,
        ce.starts_at,
        ce.ends_at,
        ce.is_completed,
        ce.lecture_id,
        ce.level_id
    FROM calendar_events ce
    WHERE ce.student_id = p_student_id
      AND ce.starts_at::date BETWEEN p_from AND p_to
    ORDER BY ce.starts_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3h. Get student milestones and achievements
CREATE OR REPLACE FUNCTION get_student_milestones(p_student_id UUID)
RETURNS TABLE (
    milestone_id UUID,
    milestone_type TEXT,
    title TEXT,
    description TEXT,
    icon TEXT,
    metadata JSONB,
    earned_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lm.id,
        lm.milestone_type,
        lm.title,
        lm.description,
        lm.icon,
        lm.metadata,
        lm.earned_at
    FROM learning_milestones lm
    WHERE lm.student_id = p_student_id
    ORDER BY lm.earned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3i. Send parent-moderator message
CREATE OR REPLACE FUNCTION send_parent_message(
    p_thread_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_attachment_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_msg_id UUID;
BEGIN
    INSERT INTO parent_moderator_messages (thread_id, sender_id, content, message_type, attachment_url)
    VALUES (p_thread_id, p_sender_id, p_content, p_message_type, p_attachment_url)
    RETURNING id INTO v_msg_id;

    UPDATE parent_moderator_threads
    SET last_message_at = now()
    WHERE id = p_thread_id;

    -- Create notification for the other party
    INSERT INTO notifications (user_id, title, message, type, link)
    SELECT
        CASE WHEN t.parent_id = p_sender_id THEN t.moderator_id ELSE t.parent_id END,
        'New Message',
        p_content,
        'message',
        '/parent-dashboard?thread=' || p_thread_id::text
    FROM parent_moderator_threads t
    WHERE t.id = p_thread_id;

    RETURN v_msg_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3j. Mark thread as read
CREATE OR REPLACE FUNCTION mark_thread_read(p_thread_id UUID, p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE parent_moderator_messages
    SET is_read = true, read_at = now()
    WHERE thread_id = p_thread_id
      AND sender_id != p_user_id
      AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3k. Create or get parent-moderator thread
CREATE OR REPLACE FUNCTION get_or_create_parent_thread(
    p_parent_id UUID,
    p_moderator_id UUID,
    p_student_id UUID,
    p_subject TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_thread_id UUID;
BEGIN
    SELECT id INTO v_thread_id
    FROM parent_moderator_threads
    WHERE parent_id = p_parent_id
      AND moderator_id = p_moderator_id
      AND student_id = p_student_id;

    IF v_thread_id IS NULL THEN
        INSERT INTO parent_moderator_threads (parent_id, moderator_id, student_id, subject)
        VALUES (p_parent_id, p_moderator_id, p_student_id, p_subject)
        RETURNING id INTO v_thread_id;
    END IF;

    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3l. Auto-notify parent when student activity happens
CREATE OR REPLACE FUNCTION notify_parent_of_student_event()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_student_name TEXT;
    v_event_title TEXT;
    v_event_message TEXT;
    v_event_type TEXT;
BEGIN
    -- Find linked parents
    FOR v_parent_id IN
        SELECT psl.parent_id FROM parent_student_links psl WHERE psl.student_id = NEW.student_id
    LOOP
        SELECT username INTO v_student_name FROM profiles WHERE id = NEW.student_id;

        CASE NEW.activity_type
            WHEN 'lesson_complete' THEN
                v_event_title := 'Lesson Completed';
                v_event_message := v_student_name || ' completed a lesson.';
                v_event_type := 'success';
            WHEN 'assignment_submit' THEN
                v_event_title := 'Assignment Submitted';
                v_event_message := v_student_name || ' submitted an assignment.';
                v_event_type := 'info';
            WHEN 'login' THEN
                v_event_title := 'Student Login';
                v_event_message := v_student_name || ' logged in.';
                v_event_type := 'info';
            WHEN 'exam_complete' THEN
                v_event_title := 'Exam Completed';
                v_event_message := v_student_name || ' completed an exam.';
                v_event_type := 'info';
            ELSE
                v_event_title := 'Student Activity';
                v_event_message := v_student_name || ' performed: ' || NEW.activity_type;
                v_event_type := 'info';
        END CASE;

        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (v_parent_id, v_event_title, v_event_message, v_event_type, '/parent-dashboard');
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_activity ON student_activity_log;
CREATE TRIGGER trg_notify_parent_activity
    AFTER INSERT ON student_activity_log
    FOR EACH ROW
    EXECUTE FUNCTION notify_parent_of_student_event();

-- 3m. Auto-notify parent when assignment is graded
CREATE OR REPLACE FUNCTION notify_parent_of_grade()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_student_name TEXT;
    v_lecture_title TEXT;
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        FOR v_parent_id IN
            SELECT psl.parent_id FROM parent_student_links psl WHERE psl.student_id = NEW.student_id
        LOOP
            SELECT username INTO v_student_name FROM profiles WHERE id = NEW.student_id;
            SELECT title INTO v_lecture_title FROM lectures WHERE id = NEW.lecture_id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                v_parent_id,
                CASE WHEN NEW.status = 'approved' THEN 'Assignment Approved' ELSE 'Assignment Needs Revision' END,
                v_student_name || '''s assignment for "' || COALESCE(v_lecture_title, 'Unknown') || '" was ' || NEW.status || '.',
                CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'warning' END,
                '/parent-dashboard'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_grade ON lecture_task_submissions;
CREATE TRIGGER trg_notify_parent_grade
    AFTER UPDATE ON lecture_task_submissions
    FOR EACH ROW
    EXECUTE FUNCTION notify_parent_of_grade();

-- 3n. Auto-notify parent when exam is graded
CREATE OR REPLACE FUNCTION notify_parent_of_exam_grade()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_student_name TEXT;
    v_lecture_title TEXT;
BEGIN
    IF NEW.total_grade IS NOT NULL AND (OLD.total_grade IS NULL OR OLD.total_grade IS DISTINCT FROM NEW.total_grade) THEN
        FOR v_parent_id IN
            SELECT psl.parent_id FROM parent_student_links psl WHERE psl.student_id = NEW.student_id
        LOOP
            SELECT username INTO v_student_name FROM profiles WHERE id = NEW.student_id;
            SELECT title INTO v_lecture_title FROM lectures WHERE id = NEW.lecture_id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                v_parent_id,
                'Exam Graded',
                v_student_name || '''s exam for "' || COALESCE(v_lecture_title, 'Unknown') || '" was graded: ' || NEW.total_grade || '%',
                'info',
                '/parent-dashboard'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_exam_grade ON exam_submissions;
CREATE TRIGGER trg_notify_parent_exam_grade
    AFTER UPDATE ON exam_submissions
    FOR EACH ROW
    EXECUTE FUNCTION notify_parent_of_exam_grade();

-- 3o. Auto-notify parent when moderator leaves feedback
CREATE OR REPLACE FUNCTION notify_parent_of_moderator_feedback()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_student_name TEXT;
BEGIN
    IF NEW.content IS DISTINCT FROM OLD.content OR NEW.id = OLD.id THEN
        FOR v_parent_id IN
            SELECT psl.parent_id FROM parent_student_links psl WHERE psl.student_id = NEW.student_id
        LOOP
            SELECT username INTO v_student_name FROM profiles WHERE id = NEW.student_id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                v_parent_id,
                'New Moderator Note',
                'A moderator left feedback for ' || v_student_name || '.',
                'info',
                '/parent-dashboard'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_note ON moderator_notes;
CREATE TRIGGER trg_notify_parent_note
    AFTER INSERT ON moderator_notes
    FOR EACH ROW
    EXECUTE FUNCTION notify_parent_of_moderator_feedback();

-- 3p. Auto-notify parent when student completes level
CREATE OR REPLACE FUNCTION notify_parent_of_level_complete()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_id UUID;
    v_student_name TEXT;
    v_level_title TEXT;
    v_total_lectures BIGINT;
    v_completed_lectures BIGINT;
    v_level_id UUID;
BEGIN
    SELECT l.level_id INTO v_level_id FROM lectures l WHERE l.id = NEW.lecture_id;

    SELECT COUNT(*) INTO v_total_lectures FROM lectures WHERE level_id = v_level_id;
    SELECT COUNT(*) INTO v_completed_lectures
    FROM student_progress sp
    JOIN lectures l ON sp.lecture_id = l.id
    WHERE sp.student_id = NEW.student_id AND l.level_id = v_level_id;

    IF v_completed_lectures >= v_total_lectures AND v_total_lectures > 0 THEN
        SELECT title INTO v_level_title FROM levels WHERE id = v_level_id;

        FOR v_parent_id IN
            SELECT psl.parent_id FROM parent_student_links psl WHERE psl.student_id = NEW.student_id
        LOOP
            SELECT username INTO v_student_name FROM profiles WHERE id = NEW.student_id;

            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES (
                v_parent_id,
                'Level Completed!',
                v_student_name || ' completed level "' || COALESCE(v_level_title, 'Unknown') || '"!',
                'success',
                '/parent-dashboard'
            );

            INSERT INTO learning_milestones (student_id, milestone_type, title, description, icon)
            VALUES (NEW.student_id, 'level_complete', 'Level Complete: ' || COALESCE(v_level_title, ''), v_student_name || ' completed all lessons in level ' || COALESCE(v_level_title, ''), '🏆');
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_parent_level_complete ON student_progress;
CREATE TRIGGER trg_notify_parent_level_complete
    AFTER INSERT ON student_progress
    FOR EACH ROW
    EXECUTE FUNCTION notify_parent_of_level_complete();

-- =============================================================
-- 4. INDEXES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_activity_student ON student_activity_log(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON student_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON student_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_student ON study_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_calendar_student ON calendar_events(student_id);
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_student_files_student ON student_files(student_id);
CREATE INDEX IF NOT EXISTS idx_pm_threads_parent ON parent_moderator_threads(parent_id);
CREATE INDEX IF NOT EXISTS idx_pm_threads_moderator ON parent_moderator_threads(moderator_id);
CREATE INDEX IF NOT EXISTS idx_pm_messages_thread ON parent_moderator_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_pm_messages_read ON parent_moderator_messages(thread_id, is_read);
CREATE INDEX IF NOT EXISTS idx_grade_history_student ON grade_history(student_id);
CREATE INDEX IF NOT EXISTS idx_milestones_student ON learning_milestones(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_parent ON notifications(user_id, created_at DESC);

-- =============================================================
-- 5. RLS POLICIES
-- =============================================================

-- student_activity_log
ALTER TABLE student_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child activity" ON student_activity_log;
CREATE POLICY "Parents view child activity" ON student_activity_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = student_activity_log.student_id)
);
DROP POLICY IF EXISTS "Students insert own activity" ON student_activity_log;
CREATE POLICY "Students insert own activity" ON student_activity_log FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators view all activity" ON student_activity_log;
CREATE POLICY "Moderators view all activity" ON student_activity_log FOR SELECT USING (is_moderator());

-- study_sessions
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child sessions" ON study_sessions;
CREATE POLICY "Parents view child sessions" ON study_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = study_sessions.student_id)
);
DROP POLICY IF EXISTS "Students manage own sessions" ON study_sessions;
CREATE POLICY "Students manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators view all sessions" ON study_sessions;
CREATE POLICY "Moderators view all sessions" ON study_sessions FOR SELECT USING (is_moderator());

-- calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child calendar" ON calendar_events;
CREATE POLICY "Parents view child calendar" ON calendar_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = calendar_events.student_id)
);
DROP POLICY IF EXISTS "Moderators manage calendar" ON calendar_events;
CREATE POLICY "Moderators manage calendar" ON calendar_events FOR ALL USING (is_moderator());

-- student_files
ALTER TABLE student_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child files" ON student_files;
CREATE POLICY "Parents view child files" ON student_files FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = student_files.student_id)
);
DROP POLICY IF EXISTS "Students view own files" ON student_files;
CREATE POLICY "Students view own files" ON student_files FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators manage files" ON student_files;
CREATE POLICY "Moderators manage files" ON student_files FOR ALL USING (is_moderator());

-- parent_moderator_threads
ALTER TABLE parent_moderator_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view own threads" ON parent_moderator_threads;
CREATE POLICY "Parents view own threads" ON parent_moderator_threads FOR SELECT USING (auth.uid() = parent_id);
DROP POLICY IF EXISTS "Moderators view assigned threads" ON parent_moderator_threads;
CREATE POLICY "Moderators view assigned threads" ON parent_moderator_threads FOR SELECT USING (auth.uid() = moderator_id);
DROP POLICY IF EXISTS "Parents create threads" ON parent_moderator_threads;
CREATE POLICY "Parents create threads" ON parent_moderator_threads FOR INSERT WITH CHECK (auth.uid() = parent_id);
DROP POLICY IF EXISTS "Moderators create threads" ON parent_moderator_threads;
CREATE POLICY "Moderators create threads" ON parent_moderator_threads FOR INSERT WITH CHECK (auth.uid() = moderator_id);

-- parent_moderator_messages
ALTER TABLE parent_moderator_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Thread participants view messages" ON parent_moderator_messages;
CREATE POLICY "Thread participants view messages" ON parent_moderator_messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM parent_moderator_threads t
        WHERE t.id = parent_moderator_messages.thread_id
          AND (t.parent_id = auth.uid() OR t.moderator_id = auth.uid())
    )
);
DROP POLICY IF EXISTS "Participants send messages" ON parent_moderator_messages;
CREATE POLICY "Participants send messages" ON parent_moderator_messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
        SELECT 1 FROM parent_moderator_threads t
        WHERE t.id = parent_moderator_messages.thread_id
          AND (t.parent_id = auth.uid() OR t.moderator_id = auth.uid())
    )
);
DROP POLICY IF EXISTS "Participants mark read" ON parent_moderator_messages;
CREATE POLICY "Participants mark read" ON parent_moderator_messages FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM parent_moderator_threads t
        WHERE t.id = parent_moderator_messages.thread_id
          AND (t.parent_id = auth.uid() OR t.moderator_id = auth.uid())
    )
);

-- grade_history
ALTER TABLE grade_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child grades" ON grade_history;
CREATE POLICY "Parents view child grades" ON grade_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = grade_history.student_id)
);
DROP POLICY IF EXISTS "Students view own grades" ON grade_history;
CREATE POLICY "Students view own grades" ON grade_history FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "System insert grades" ON grade_history;
CREATE POLICY "System insert grades" ON grade_history FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Moderators manage grades" ON grade_history;
CREATE POLICY "Moderators manage grades" ON grade_history FOR ALL USING (is_moderator());

-- learning_milestones
ALTER TABLE learning_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child milestones" ON learning_milestones;
CREATE POLICY "Parents view child milestones" ON learning_milestones FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = learning_milestones.student_id)
);
DROP POLICY IF EXISTS "Students view own milestones" ON learning_milestones;
CREATE POLICY "Students view own milestones" ON learning_milestones FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "System insert milestones" ON learning_milestones;
CREATE POLICY "System insert milestones" ON learning_milestones FOR INSERT WITH CHECK (true);

-- Update existing notifications policies to allow parent visibility
DROP POLICY IF EXISTS "Parents view own notifications" ON notifications;
CREATE POLICY "Parents view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================
-- 6. ENABLE REALTIME
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE parent_moderator_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE parent_moderator_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE student_activity_log;
