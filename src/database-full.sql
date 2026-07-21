-- =============================================================
-- ST-COMPANY: FINAL CONSOLIDATED DATABASE SCHEMA (v18.0)
-- Includes: Sequential Progression, Video Completion Security,
--           Exams, Analytics, Storage Policies, Admin/Moderator Clearance,
--           Performance Indexes, and Strict "Admin Choice" Access.
-- =============================================================

-- 1. ENUMS & INITIAL SETUP
----------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'student', 'parent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- 2. CORE TABLES
----------------------------------------------------------------

-- Profiles: User information and roles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    user_number TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    score INTEGER DEFAULT 0,
    avatar_url TEXT,
    xp INTEGER DEFAULT 0,
    role user_role NOT NULL DEFAULT 'student',
    is_admin BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    work_duration INTEGER DEFAULT 25,
    break_duration INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure phone_number exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE;

-- Parent-Student Link Table
CREATE TABLE IF NOT EXISTS parent_student_links (
    parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (parent_id, student_id)
);

ALTER TABLE parent_student_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage parent links" ON parent_student_links;
CREATE POLICY "Moderators manage parent links" ON parent_student_links FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Parents view own links" ON parent_student_links;
CREATE POLICY "Parents view own links" ON parent_student_links FOR SELECT USING (auth.uid() = parent_id OR auth.uid() = student_id);

-- Student Homework
CREATE TABLE IF NOT EXISTS student_homework (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Moderator Notes
CREATE TABLE IF NOT EXISTS moderator_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID,
    attempt_number INTEGER DEFAULT 1,
    is_passed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure missing columns exist if table was already created
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'student';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_duration INTEGER DEFAULT 25;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS break_duration INTEGER DEFAULT 5;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE levels ADD COLUMN IF NOT EXISTS drip_interval_days INTEGER DEFAULT 7;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS drip_days INTEGER DEFAULT 7;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS is_big_exam BOOLEAN DEFAULT false;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT '[]';

-- Levels: Course categories / stages
CREATE TABLE IF NOT EXISTS levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    level_order INTEGER UNIQUE NOT NULL,
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    drip_interval_days INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Spotlight: Employee/Student of the Month
CREATE TABLE IF NOT EXISTS spotlight (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    avatar_override_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE spotlight ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public spotlight view" ON spotlight;
CREATE POLICY "Public spotlight view" ON spotlight FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage spotlight" ON spotlight;
CREATE POLICY "Admin manage spotlight" ON spotlight FOR ALL USING (is_moderator());

-- Lectures: Individual modules within levels
CREATE TABLE IF NOT EXISTS lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    content_blocks JSONB DEFAULT '[]',
    video_url TEXT,
    pdf_url TEXT,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 100),
    is_live BOOLEAN DEFAULT true,
    quiz_required BOOLEAN DEFAULT false,
    quiz_data JSONB DEFAULT '[]',
    is_big_exam BOOLEAN DEFAULT false,
    drip_days INTEGER DEFAULT 7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(level_id, slot_number)
);

-- FIX: Allow reordering by making unique constraint deferrable
ALTER TABLE lectures DROP CONSTRAINT IF EXISTS lectures_level_id_slot_number_key;
ALTER TABLE lectures ADD CONSTRAINT lectures_level_id_slot_number_key UNIQUE (level_id, slot_number) DEFERRABLE INITIALLY DEFERRED;

-- Exams: Final evaluations for levels
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID UNIQUE,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Exam Analytics
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID,
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS exam_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    selected_option INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL
);

-- Exam Submissions (For MCQ + Written/File Grading)
CREATE TABLE IF NOT EXISTS exam_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID,
    answers JSONB NOT NULL DEFAULT '[]',
    mcq_score INTEGER,
    written_score INTEGER,
    total_grade INTEGER,
    moderator_feedback TEXT,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students view own submissions" ON exam_submissions;
CREATE POLICY "Students view own submissions" ON exam_submissions FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Students insert own submissions" ON exam_submissions;
CREATE POLICY "Students insert own submissions" ON exam_submissions FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators manage submissions" ON exam_submissions;
CREATE POLICY "Moderators manage submissions" ON exam_submissions FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Parents view child submissions" ON exam_submissions;
CREATE POLICY "Parents view child submissions" ON exam_submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = exam_submissions.student_id)
);

-- Internal Tasks: Admin to Moderator tasking
CREATE TABLE IF NOT EXISTS internal_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    section TEXT,
    timeline TEXT,
    course_time TEXT,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Student Progress: Tracks completed lectures
CREATE TABLE IF NOT EXISTS student_progress (
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (student_id, lecture_id)
);

-- Level Access: Whitelist for specific users (manual override)
CREATE TABLE IF NOT EXISTS level_access (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, level_id)
);

-- Level Chats: Classroom communication
CREATE TABLE IF NOT EXISTS level_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Direct Messages: Peer-to-peer communication
CREATE TABLE IF NOT EXISTS direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Games: Interactive elements (Tic-Tac-Toe)
CREATE TABLE IF NOT EXISTS games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_x UUID REFERENCES profiles(id) ON DELETE CASCADE,
    player_o UUID REFERENCES profiles(id) ON DELETE CASCADE,
    board JSONB DEFAULT '[null, null, null, null, null, null, null, null, null]',
    current_turn TEXT DEFAULT 'X',
    status TEXT DEFAULT 'pending',
    winner TEXT,
    winner_id UUID REFERENCES profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Todos: Personal task management
CREATE TABLE IF NOT EXISTS todos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    category TEXT DEFAULT 'Research',
    is_completed BOOLEAN DEFAULT false,
    time_limit INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. HELPER FUNCTIONS & RPCs
----------------------------------------------------------------

-- Check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is moderator
CREATE OR REPLACE FUNCTION is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if current user is approved
CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_approved = true OR role IN ('admin', 'moderator'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Combined level access check (Whitelist + Sequential)
CREATE OR REPLACE FUNCTION has_level_access(l_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF is_moderator() THEN RETURN TRUE; END IF;

    IF EXISTS (SELECT 1 FROM level_access WHERE user_id = auth.uid() AND level_id = l_id) THEN
      RETURN TRUE;
    END IF;

    RETURN is_approved() AND can_student_access_level(auth.uid(), l_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if student has access to a level (Manual + Sequential Progression)
CREATE OR REPLACE FUNCTION can_student_access_level(u_id UUID, target_level_id UUID) RETURNS BOOLEAN AS $$
    DECLARE prev_level_id UUID; current_level_order INTEGER; lectures_count INTEGER; completed_count INTEGER; has_manual BOOLEAN;
    BEGIN
      IF EXISTS (SELECT 1 FROM level_access WHERE user_id = u_id AND level_id = target_level_id) THEN
        RETURN TRUE;
      END IF;

      SELECT EXISTS (SELECT 1 FROM level_access WHERE user_id = u_id) INTO has_manual;
      
      SELECT level_order INTO current_level_order FROM level_templates WHERE id = target_level_id;
      
      IF current_level_order = 1 THEN 
        IF has_manual THEN
          RETURN FALSE;
        ELSE
          RETURN TRUE;
        END IF;
      END IF;

      IF has_manual THEN
        RETURN FALSE;
      END IF;

      SELECT id INTO prev_level_id FROM level_templates WHERE level_order < current_level_order ORDER BY level_order DESC LIMIT 1;
      IF prev_level_id IS NULL THEN RETURN TRUE; END IF;
      
      SELECT COUNT(*) INTO lectures_count FROM lecture_templates WHERE level_template_id = prev_level_id AND is_live IS NOT FALSE;
      SELECT COUNT(*) INTO completed_count FROM student_progress JOIN lecture_templates ON student_progress.lecture_id = lecture_templates.id WHERE student_progress.student_id = u_id AND lecture_templates.level_template_id = prev_level_id;
      
      RETURN completed_count >= lectures_count;
    END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce sequential lecture access within a level
CREATE OR REPLACE FUNCTION can_access_lecture(p_lecture_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_level_template_id UUID;
    v_slot_number INTEGER;
    v_drip_interval INTEGER;
    v_level_access_granted_at TIMESTAMP WITH TIME ZONE;
    v_incomplete_count INTEGER;
BEGIN
    IF is_moderator() THEN RETURN TRUE; END IF;

    SELECT level_template_id, slot_number INTO v_level_template_id, v_slot_number FROM lecture_templates WHERE id = p_lecture_id;

    IF NOT has_level_access(v_level_template_id) THEN RETURN FALSE; END IF;

    -- Drip Logic: Check when level access was granted
    SELECT granted_at INTO v_level_access_granted_at 
    FROM level_access 
    WHERE user_id = auth.uid() AND level_id = v_level_template_id;

    IF v_level_access_granted_at IS NULL THEN
        v_level_access_granted_at := NOW();
    END IF;

    SELECT drip_days INTO v_drip_interval FROM level_templates WHERE id = v_level_template_id;
    v_drip_interval := COALESCE(v_drip_interval, 7);

    IF (v_slot_number - 1) * v_drip_interval > EXTRACT(DAY FROM (NOW() - v_level_access_granted_at)) THEN
        RETURN FALSE;
    END IF;

    IF v_slot_number = 1 THEN RETURN TRUE; END IF;

    SELECT COUNT(*) INTO v_incomplete_count
    FROM lecture_templates lt
    LEFT JOIN student_progress sp ON lt.id = sp.lecture_id AND sp.student_id = auth.uid()
    WHERE lt.level_template_id = v_level_template_id
      AND lt.slot_number < v_slot_number
      AND sp.lecture_id IS NULL;

    RETURN v_incomplete_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure lecture completion
CREATE OR REPLACE FUNCTION complete_lecture_secure(p_lecture_id UUID)
RETURNS VOID AS $$
BEGIN
    IF NOT can_access_lecture(p_lecture_id) THEN
      RAISE EXCEPTION 'Lecture locked or prerequisites not met.';
    END IF;

    INSERT INTO student_progress (student_id, lecture_id)
    VALUES (auth.uid(), p_lecture_id)
    ON CONFLICT (student_id, lecture_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3b. MULTI-GROUP SUPPORT
----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_groups (
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (student_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_student_groups_student ON student_groups(student_id);
CREATE INDEX IF NOT EXISTS idx_student_groups_group ON student_groups(group_id);

-- Helper: check if user belongs to a group (via junction table OR legacy group_id)
CREATE OR REPLACE FUNCTION is_member_of_group(p_group_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM student_groups WHERE student_id = auth.uid() AND group_id = p_group_id
    ) OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND group_id = p_group_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: get all group_ids for a user
CREATE OR REPLACE FUNCTION get_my_group_ids()
RETURNS SETOF UUID AS $$
    SELECT group_id FROM student_groups WHERE student_id = auth.uid()
    UNION
    SELECT group_id FROM profiles WHERE id = auth.uid() AND group_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Backfill: populate student_groups from legacy profiles.group_id
INSERT INTO student_groups (student_id, group_id)
SELECT id, group_id FROM profiles WHERE group_id IS NOT NULL
ON CONFLICT (student_id, group_id) DO NOTHING;

-- 4. SECURITY POLICIES (RLS)
----------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage profiles" ON profiles;
CREATE POLICY "Manage profiles" ON profiles FOR UPDATE USING (auth.uid() = id OR is_moderator());
DROP POLICY IF EXISTS "Admins full access" ON profiles;
CREATE POLICY "Admins full access" ON profiles FOR ALL USING (is_admin());

-- Student Groups (multi-group junction)
DROP POLICY IF EXISTS "Students view own groups" ON student_groups;
CREATE POLICY "Students view own groups" ON student_groups FOR SELECT USING (auth.uid() = student_id OR is_moderator());
DROP POLICY IF EXISTS "Moderators manage student groups" ON student_groups;
CREATE POLICY "Moderators manage student groups" ON student_groups FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Admins manage student groups" ON student_groups;
CREATE POLICY "Admins manage student groups" ON student_groups FOR ALL USING (is_admin());

-- Prevent moderators from promoting users to admin via trigger
CREATE OR REPLACE FUNCTION prevent_moderator_admin_promotion()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_admin() AND NEW.role = 'admin' THEN
    RAISE EXCEPTION 'Moderators cannot promote users to admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_admin_promotion ON profiles;
CREATE TRIGGER trg_prevent_admin_promotion
  BEFORE UPDATE OF role ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_moderator_admin_promotion();

-- Levels
DROP POLICY IF EXISTS "View levels" ON levels;
CREATE POLICY "View levels" ON levels FOR SELECT USING (is_moderator() OR (is_published = true AND has_level_access(id)));
DROP POLICY IF EXISTS "Manage levels" ON levels;
CREATE POLICY "Manage levels" ON levels FOR ALL USING (is_moderator());

-- Lectures
DROP POLICY IF EXISTS "View lectures" ON lectures;
CREATE POLICY "View lectures" ON lectures FOR SELECT USING (is_moderator() OR can_access_lecture(id));
DROP POLICY IF EXISTS "Manage lectures" ON lectures;
CREATE POLICY "Manage lectures" ON lectures FOR ALL USING (is_moderator());

-- Exams
DROP POLICY IF EXISTS "View exams" ON exams;
CREATE POLICY "View exams" ON exams FOR SELECT USING (is_moderator() OR (is_approved() AND has_level_access(level_id)));
DROP POLICY IF EXISTS "Manage exams" ON exams;
CREATE POLICY "Manage exams" ON exams FOR ALL USING (is_moderator());

-- Analytics (Attempts/Responses)
DROP POLICY IF EXISTS "Students view own attempts" ON exam_attempts;
CREATE POLICY "Students view own attempts" ON exam_attempts FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators view all attempts" ON exam_attempts;
CREATE POLICY "Moderators view all attempts" ON exam_attempts FOR SELECT USING (is_moderator());
DROP POLICY IF EXISTS "Students insert own attempts" ON exam_attempts;
CREATE POLICY "Students insert own attempts" ON exam_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students view own responses" ON exam_responses;
CREATE POLICY "Students view own responses" ON exam_responses FOR SELECT USING (EXISTS (SELECT 1 FROM exam_attempts WHERE exam_attempts.id = exam_responses.attempt_id AND student_id = auth.uid()));
DROP POLICY IF EXISTS "Moderators view all responses" ON exam_responses;
CREATE POLICY "Moderators view all responses" ON exam_responses FOR SELECT USING (is_moderator());
DROP POLICY IF EXISTS "Students insert own responses" ON exam_responses;
CREATE POLICY "Students insert own responses" ON exam_responses FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM exam_attempts WHERE exam_attempts.id = exam_responses.attempt_id AND student_id = auth.uid()));

-- Internal Tasks
DROP POLICY IF EXISTS "Moderators view tasks" ON internal_tasks;
CREATE POLICY "Moderators view tasks" ON internal_tasks FOR SELECT USING (is_moderator());
DROP POLICY IF EXISTS "Admins manage tasks" ON internal_tasks;
CREATE POLICY "Admins manage tasks" ON internal_tasks FOR ALL USING (is_admin());

-- Student Progress
DROP POLICY IF EXISTS "Manage own progress" ON student_progress;
DROP POLICY IF EXISTS "Student insert progress" ON student_progress;
CREATE POLICY "Manage own progress" ON student_progress FOR SELECT USING (
  auth.uid() = student_id OR 
  is_moderator() OR 
  EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = student_progress.student_id)
);
CREATE POLICY "Student insert progress" ON student_progress FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Level Access
DROP POLICY IF EXISTS "View own access" ON level_access;
DROP POLICY IF EXISTS "Manage access" ON level_access;
CREATE POLICY "View own access" ON level_access FOR SELECT USING (
  auth.uid() = user_id OR 
  is_moderator() OR 
  EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = level_access.user_id)
);
CREATE POLICY "Manage access" ON level_access FOR ALL USING (is_moderator());

-- Level Chats
DROP POLICY IF EXISTS "View chat" ON level_chats;
CREATE POLICY "View chat" ON level_chats FOR SELECT USING (
    is_moderator()
    OR group_id IS NULL
    OR is_member_of_group(group_id)
);
DROP POLICY IF EXISTS "Post chat" ON level_chats;
CREATE POLICY "Post chat" ON level_chats FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (group_id IS NULL OR is_moderator() OR is_member_of_group(group_id))
);
DROP POLICY IF EXISTS "Moderators delete chat" ON level_chats;
CREATE POLICY "Moderators delete chat" ON level_chats FOR DELETE USING (is_moderator());

-- Direct Messages
DROP POLICY IF EXISTS "View messages" ON direct_messages;
CREATE POLICY "View messages" ON direct_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR is_admin());
DROP POLICY IF EXISTS "Send messages" ON direct_messages;
CREATE POLICY "Send messages" ON direct_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Update messages" ON direct_messages;
CREATE POLICY "Update messages" ON direct_messages FOR UPDATE USING (auth.uid() = receiver_id);

-- Games
DROP POLICY IF EXISTS "View games" ON games;
CREATE POLICY "View games" ON games FOR SELECT USING (true);
DROP POLICY IF EXISTS "Manage games" ON games;
CREATE POLICY "Manage games" ON games FOR ALL USING (auth.uid() = player_x OR auth.uid() = player_o OR is_admin());

-- Todos
DROP POLICY IF EXISTS "Manage own todos" ON todos;
CREATE POLICY "Manage own todos" ON todos FOR ALL USING (auth.uid() = user_id OR is_admin());

-- 5. STORAGE BUCKETS & POLICIES
----------------------------------------------------------------

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true), ('course_files', 'course_files', true), ('videos', 'videos', true), ('submissions', 'submissions', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
DROP POLICY IF EXISTS "Public Read Avatars" ON storage.objects;
CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING ( bucket_id = 'avatars' );
DROP POLICY IF EXISTS "Public Read Course Files" ON storage.objects;
CREATE POLICY "Public Read Course Files" ON storage.objects FOR SELECT USING ( bucket_id = 'course_files' );
DROP POLICY IF EXISTS "Public Read Videos" ON storage.objects;
CREATE POLICY "Public Read Videos" ON storage.objects FOR SELECT USING ( bucket_id = 'videos' );
DROP POLICY IF EXISTS "Public Read Submissions" ON storage.objects;
CREATE POLICY "Public Read Submissions" ON storage.objects FOR SELECT USING ( bucket_id = 'submissions' );

-- Upload policies
DROP POLICY IF EXISTS "Users upload avatars" ON storage.objects;
CREATE POLICY "Users upload avatars" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );
DROP POLICY IF EXISTS "Moderators upload course_files" ON storage.objects;
CREATE POLICY "Moderators upload course_files" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'course_files' AND is_moderator() );
DROP POLICY IF EXISTS "Moderators upload videos" ON storage.objects;
CREATE POLICY "Moderators upload videos" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'videos' AND is_moderator() );
DROP POLICY IF EXISTS "Students upload submissions" ON storage.objects;
CREATE POLICY "Students upload submissions" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'submissions' AND auth.role() = 'authenticated' );

-- Update/Delete policies
DROP POLICY IF EXISTS "Users manage own avatars" ON storage.objects;
CREATE POLICY "Users manage own avatars" ON storage.objects FOR ALL USING ( bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1] );
DROP POLICY IF EXISTS "Moderators manage course_files" ON storage.objects;
CREATE POLICY "Moderators manage course_files" ON storage.objects FOR ALL USING ( bucket_id = 'course_files' AND is_moderator() );
DROP POLICY IF EXISTS "Moderators manage videos" ON storage.objects;
CREATE POLICY "Moderators manage videos" ON storage.objects FOR ALL USING ( bucket_id = 'videos' AND is_moderator() );
DROP POLICY IF EXISTS "Students manage own submissions" ON storage.objects;
CREATE POLICY "Students manage own submissions" ON storage.objects FOR ALL USING ( bucket_id = 'submissions' AND auth.uid()::text = (storage.foldername(name))[1] );

-- 6. REALTIME ENABLEMENT
----------------------------------------------------------------
BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime FOR TABLE games, todos, profiles, student_progress, level_chats, direct_messages, internal_tasks, exam_attempts;
COMMIT;

-- 7. PERFORMANCE OPTIMIZATIONS (INDEXES)
----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lectures_level_id ON lectures(level_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_student_id ON exam_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_level_id ON exam_attempts(level_id);
CREATE INDEX IF NOT EXISTS idx_exam_responses_attempt_id ON exam_responses(attempt_id);
CREATE INDEX IF NOT EXISTS idx_level_access_user_id ON level_access(user_id);
CREATE INDEX IF NOT EXISTS idx_level_chats_level_id ON level_chats(level_id);
CREATE INDEX IF NOT EXISTS idx_internal_tasks_assigned_to ON internal_tasks(assigned_to_id);

-- 8. DROP ALL OLD FK CONSTRAINTS THAT REFERENCE deprecated levels/lectures/exams tables
-- These block inserts because data now uses level_templates/lecture_templates/exam_templates
----------------------------------------------------------------
ALTER TABLE student_progress DROP CONSTRAINT IF EXISTS student_progress_lecture_id_fkey;
ALTER TABLE level_access DROP CONSTRAINT IF EXISTS level_access_level_id_fkey;
ALTER TABLE quiz_attempts DROP CONSTRAINT IF EXISTS quiz_attempts_lecture_id_fkey;
ALTER TABLE assignment_overrides DROP CONSTRAINT IF EXISTS assignment_overrides_lecture_id_fkey;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_lecture_id_fkey;
ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_level_id_fkey;
ALTER TABLE student_files DROP CONSTRAINT IF EXISTS student_files_lecture_id_fkey;
ALTER TABLE parent_moderator_threads DROP CONSTRAINT IF EXISTS parent_moderator_threads_level_id_fkey;
ALTER TABLE grade_history DROP CONSTRAINT IF EXISTS grade_history_lecture_id_fkey;
ALTER TABLE grade_history DROP CONSTRAINT IF EXISTS grade_history_exam_id_fkey;
ALTER TABLE level_chats DROP CONSTRAINT IF EXISTS level_chats_level_id_fkey;
ALTER TABLE level_chats DROP CONSTRAINT IF EXISTS level_chats_lecture_id_fkey;
ALTER TABLE level_chats DROP CONSTRAINT IF EXISTS level_chats_leacture_id_fkey;
ALTER TABLE level_chats DROP CONSTRAINT IF EXISTS fk_level_chats_lecture;
ALTER TABLE lecture_task_submissions DROP CONSTRAINT IF EXISTS lecture_task_submissions_lecture_id_fkey;
ALTER TABLE lecture_task_submissions DROP CONSTRAINT IF EXISTS fk_lecture_task_submissions_lecture;
ALTER TABLE exam_attempts DROP CONSTRAINT IF EXISTS exam_attempts_level_id_fkey;
ALTER TABLE exam_responses DROP CONSTRAINT IF EXISTS exam_responses_lecture_id_fkey;
ALTER TABLE exam_responses DROP CONSTRAINT IF EXISTS exam_responses_level_id_fkey;
ALTER TABLE exam_responses DROP CONSTRAINT IF EXISTS exam_responses_exam_id_fkey;

-- 8a. PER-LECTURE CHAT ROOMS
-- Adds lecture_id to level_chats so each lecture can have its own chat thread.
-- Existing messages (lecture_id = NULL) remain as level-wide classroom chat.
----------------------------------------------------------------
ALTER TABLE level_chats DROP CONSTRAINT IF EXISTS level_chats_level_id_fkey;
ALTER TABLE level_chats ADD COLUMN IF NOT EXISTS lecture_id UUID;
CREATE INDEX IF NOT EXISTS idx_level_chats_lecture_id ON level_chats(lecture_id);

-- =============================================================
-- 8b. GROUP-SCOPED CHAT & TASKS
-- Adds group_id to level_chats and lecture_task_submissions
-- so each group has its own separate chat and task space.
-- =============================================================
ALTER TABLE lecture_task_submissions DROP CONSTRAINT IF EXISTS lecture_task_submissions_lecture_id_fkey;
ALTER TABLE level_chats ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_level_chats_group ON level_chats(group_id);

ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_task_submissions_group ON lecture_task_submissions(group_id);

-- =============================================================
-- 2b. ASSIGNMENT ACCESS CONTROL (NEW COLUMNS & TABLES)
-- =============================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_name TEXT;

ALTER TABLE lectures ADD COLUMN IF NOT EXISTS assignment_required BOOLEAN DEFAULT false;
ALTER TABLE lectures ADD COLUMN IF NOT EXISTS assignment_description TEXT;

-- Lecture Task Submissions: Student assignment submissions
CREATE TABLE IF NOT EXISTS lecture_task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID,
    image_url TEXT,
    file_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    feedback TEXT,
    grade INTEGER,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(student_id, lecture_id)
);

ALTER TABLE lecture_task_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students manage own submissions" ON lecture_task_submissions;
CREATE POLICY "Students manage own submissions" ON lecture_task_submissions FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators manage task submissions" ON lecture_task_submissions;
CREATE POLICY "Moderators manage task submissions" ON lecture_task_submissions FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Parents view child submissions" ON lecture_task_submissions;
CREATE POLICY "Parents view child submissions" ON lecture_task_submissions FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = lecture_task_submissions.student_id)
);

-- The ALTERs below are safe no-ops since columns are now created above

ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE lecture_task_submissions ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ============================================
-- ASSIGNMENT SUBMISSION & LESSON ACCESS CONTROL
-- Migration: assignment-access-control.sql
-- ============================================

-- 1. Add assignment fields to lectures

-- 2. Extend lecture_task_submissions with status tracking

-- 3. Assignment overrides (manual moderator unlock)
CREATE TABLE IF NOT EXISTS assignment_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID,
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
    SELECT lt2.id INTO v_next_lecture_id
    FROM lecture_templates lt1
    JOIN lecture_templates lt2 ON lt1.level_template_id = lt2.level_template_id AND lt2.slot_number = lt1.slot_number + 1
    WHERE lt1.id = p_current_lecture_id;

    IF v_next_lecture_id IS NULL THEN
        RETURN TRUE;
    END IF;

    SELECT assignment_required INTO v_next_assignment_required
    FROM lecture_templates WHERE id = v_next_lecture_id;

    IF NOT v_next_assignment_required THEN
        RETURN TRUE;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM assignment_overrides
        WHERE student_id = p_student_id AND lecture_id = v_next_lecture_id
    ) INTO v_has_override;

    IF v_has_override THEN
        RETURN TRUE;
    END IF;

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
ALTER TABLE assignment_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Moderators can manage overrides" ON assignment_overrides;
CREATE POLICY "Moderators can manage overrides" ON assignment_overrides
    FOR ALL USING (is_moderator());

DROP POLICY IF EXISTS "Students can view own overrides" ON assignment_overrides;
CREATE POLICY "Students can view own overrides" ON assignment_overrides
    FOR SELECT USING (auth.uid() = student_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE lecture_task_submissions;


-- =============================================================
-- 2c. PARENT PORTAL TABLES
-- =============================================================

-- PARENT PORTAL — Complete Student Monitoring & Communication
-- Migration: parent-portal.sql


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

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER DEFAULT 0,
    lectures_viewed UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);

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
    lecture_id UUID,
    level_id UUID,
    is_completed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

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
    lecture_id UUID,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS parent_moderator_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    moderator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID,
    subject TEXT,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(parent_id, moderator_id, student_id)
);

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

CREATE TABLE IF NOT EXISTS grade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    lecture_id UUID,
    exam_id UUID,
    grade_type TEXT NOT NULL CHECK (grade_type IN ('assignment', 'quiz', 'exam')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    max_score INTEGER DEFAULT 100,
    feedback TEXT,
    graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

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
-- 3b. ASSIGNMENT ACCESS CONTROL FUNCTIONS
-- =============================================================

CREATE OR REPLACE FUNCTION can_access_next_lecture(p_current_lecture_id UUID, p_student_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_next_lecture_id UUID;
    v_next_assignment_required BOOLEAN;
    v_submission_status TEXT;
    v_has_override BOOLEAN;
BEGIN
    SELECT lt2.id INTO v_next_lecture_id
    FROM lecture_templates lt1
    JOIN lecture_templates lt2 ON lt1.level_template_id = lt2.level_template_id AND lt2.slot_number = lt1.slot_number + 1
    WHERE lt1.id = p_current_lecture_id;

    IF v_next_lecture_id IS NULL THEN
        RETURN TRUE;
    END IF;

    SELECT assignment_required INTO v_next_assignment_required
    FROM lecture_templates WHERE id = v_next_lecture_id;

    IF NOT v_next_assignment_required THEN
        RETURN TRUE;
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM assignment_overrides
        WHERE student_id = p_student_id AND lecture_id = v_next_lecture_id
    ) INTO v_has_override;

    IF v_has_override THEN
        RETURN TRUE;
    END IF;

    SELECT status INTO v_submission_status
    FROM lecture_task_submissions
    WHERE student_id = p_student_id AND lecture_id = p_current_lecture_id;

    RETURN v_submission_status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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


-- =============================================================
-- 3c. PARENT PORTAL FUNCTIONS
-- =============================================================

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
        (SELECT COUNT(*) FROM lecture_templates l
         JOIN level_templates lv ON l.level_template_id = lv.id
         JOIN group_level_assignments gla ON gla.level_template_id = lv.id
         WHERE gla.group_id IN (SELECT get_my_group_ids()))::BIGINT,
        (SELECT COUNT(*) FROM student_progress sp
         WHERE sp.student_id = p_student_id)::BIGINT,
        (SELECT COUNT(*) FROM lecture_templates l
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
        (SELECT COUNT(*) FROM level_templates WHERE is_published = true)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
        (SELECT COUNT(*) FROM lecture_templates l WHERE l.level_template_id = lv.id AND l.is_live IS NOT FALSE)::BIGINT,
        (SELECT COUNT(*) FROM lecture_templates l
         JOIN student_progress sp ON l.id = sp.lecture_id
         WHERE l.level_template_id = lv.id AND sp.student_id = p_student_id)::BIGINT,
        CASE
            WHEN (SELECT COUNT(*) FROM lecture_templates l WHERE l.level_template_id = lv.id AND l.is_live IS NOT FALSE) = 0 THEN 0
            ELSE ROUND(
                (SELECT COUNT(*)::NUMERIC FROM lecture_templates l
                 JOIN student_progress sp ON l.id = sp.lecture_id
                 WHERE l.level_template_id = lv.id AND sp.student_id = p_student_id)
                * 100.0
                / (SELECT COUNT(*) FROM lecture_templates l WHERE l.level_template_id = lv.id AND l.is_live IS NOT FALSE)
            , 1)
        END,
        (SELECT MAX(sp.completed_at) FROM student_progress sp
         JOIN lecture_templates l ON sp.lecture_id = l.id
         WHERE l.level_template_id = lv.id AND sp.student_id = p_student_id),
        EXISTS(SELECT 1 FROM level_access la WHERE la.user_id = p_student_id AND la.level_id = lv.id)
    FROM level_templates lv
    WHERE lv.is_published = true
    ORDER BY lv.level_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    FROM lecture_templates l
    WHERE l.level_template_id = p_level_id
    ORDER BY l.slot_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    JOIN lecture_templates l ON lts.lecture_id = l.id
    JOIN level_templates lv ON l.level_template_id = lv.id
    WHERE lts.student_id = p_student_id
    ORDER BY lts.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    JOIN lecture_templates l ON lts.lecture_id = l.id
    JOIN level_templates lv ON l.level_template_id = lv.id
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
    JOIN lecture_templates l ON es.lecture_id = l.id
    JOIN level_templates lv ON l.level_template_id = lv.id
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
            SELECT title INTO v_lecture_title FROM lecture_templates WHERE id = NEW.lecture_id;

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
            SELECT title INTO v_lecture_title FROM lecture_templates WHERE id = NEW.lecture_id;

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
    SELECT l.level_template_id INTO v_level_id FROM lecture_templates l WHERE l.id = NEW.lecture_id;

    SELECT COUNT(*) INTO v_total_lectures FROM lecture_templates WHERE level_template_id = v_level_id;
    SELECT COUNT(*) INTO v_completed_lectures
    FROM student_progress sp
    JOIN lecture_templates l ON sp.lecture_id = l.id
    WHERE sp.student_id = NEW.student_id AND l.level_template_id = v_level_id;

    IF v_completed_lectures >= v_total_lectures AND v_total_lectures > 0 THEN
        SELECT title INTO v_level_title FROM level_templates WHERE id = v_level_id;

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


-- =============================================================
-- 4b. RLS POLICIES FOR NEW TABLES
-- =============================================================

ALTER TABLE student_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child activity" ON student_activity_log;
CREATE POLICY "Parents view child activity" ON student_activity_log FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = student_activity_log.student_id)
);
DROP POLICY IF EXISTS "Students insert own activity" ON student_activity_log;
CREATE POLICY "Students insert own activity" ON student_activity_log FOR INSERT WITH CHECK (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators view all activity" ON student_activity_log;
CREATE POLICY "Moderators view all activity" ON student_activity_log FOR SELECT USING (is_moderator());
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child sessions" ON study_sessions;
CREATE POLICY "Parents view child sessions" ON study_sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = study_sessions.student_id)
);
DROP POLICY IF EXISTS "Students manage own sessions" ON study_sessions;
CREATE POLICY "Students manage own sessions" ON study_sessions FOR ALL USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators view all sessions" ON study_sessions;
CREATE POLICY "Moderators view all sessions" ON study_sessions FOR SELECT USING (is_moderator());
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child calendar" ON calendar_events;
CREATE POLICY "Parents view child calendar" ON calendar_events FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = calendar_events.student_id)
);
DROP POLICY IF EXISTS "Moderators manage calendar" ON calendar_events;
CREATE POLICY "Moderators manage calendar" ON calendar_events FOR ALL USING (is_moderator());
ALTER TABLE student_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child files" ON student_files;
CREATE POLICY "Parents view child files" ON student_files FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = student_files.student_id)
);
DROP POLICY IF EXISTS "Students view own files" ON student_files;
CREATE POLICY "Students view own files" ON student_files FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "Moderators manage files" ON student_files;
CREATE POLICY "Moderators manage files" ON student_files FOR ALL USING (is_moderator());
ALTER TABLE parent_moderator_threads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view own threads" ON parent_moderator_threads;
CREATE POLICY "Parents view own threads" ON parent_moderator_threads FOR SELECT USING (auth.uid() = parent_id);
DROP POLICY IF EXISTS "Moderators view assigned threads" ON parent_moderator_threads;
CREATE POLICY "Moderators view assigned threads" ON parent_moderator_threads FOR SELECT USING (auth.uid() = moderator_id);
DROP POLICY IF EXISTS "Parents create threads" ON parent_moderator_threads;
CREATE POLICY "Parents create threads" ON parent_moderator_threads FOR INSERT WITH CHECK (auth.uid() = parent_id);
DROP POLICY IF EXISTS "Moderators create threads" ON parent_moderator_threads;
CREATE POLICY "Moderators create threads" ON parent_moderator_threads FOR INSERT WITH CHECK (auth.uid() = moderator_id);
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
ALTER TABLE learning_milestones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Parents view child milestones" ON learning_milestones;
CREATE POLICY "Parents view child milestones" ON learning_milestones FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_student_links WHERE parent_id = auth.uid() AND student_id = learning_milestones.student_id)
);
DROP POLICY IF EXISTS "Students view own milestones" ON learning_milestones;
CREATE POLICY "Students view own milestones" ON learning_milestones FOR SELECT USING (auth.uid() = student_id);
DROP POLICY IF EXISTS "System insert milestones" ON learning_milestones;
CREATE POLICY "System insert milestones" ON learning_milestones FOR INSERT WITH CHECK (true);

-- Assignment Overrides
ALTER TABLE assignment_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators can manage overrides" ON assignment_overrides;
CREATE POLICY "Moderators can manage overrides" ON assignment_overrides FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students can view own overrides" ON assignment_overrides;
CREATE POLICY "Students can view own overrides" ON assignment_overrides FOR SELECT USING (auth.uid() = student_id);

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);


-- =============================================================
-- 6. TRIGGERS — Auto-Notifications
-- =============================================================

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
            SELECT title INTO v_lecture_title FROM lecture_templates WHERE id = NEW.lecture_id;

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
            SELECT title INTO v_lecture_title FROM lecture_templates WHERE id = NEW.lecture_id;

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
    SELECT l.level_template_id INTO v_level_id FROM lecture_templates l WHERE l.id = NEW.lecture_id;

    SELECT COUNT(*) INTO v_total_lectures FROM lecture_templates WHERE level_template_id = v_level_id;
    SELECT COUNT(*) INTO v_completed_lectures
    FROM student_progress sp
    JOIN lecture_templates l ON sp.lecture_id = l.id
    WHERE sp.student_id = NEW.student_id AND l.level_template_id = v_level_id;

    IF v_completed_lectures >= v_total_lectures AND v_total_lectures > 0 THEN
        SELECT title INTO v_level_title FROM level_templates WHERE id = v_level_id;

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


-- =============================================================
-- 7. REALTIME ENABLEMENT (UPDATED)
-- =============================================================

BEGIN;
    DROP PUBLICATION IF EXISTS supabase_realtime;
    CREATE PUBLICATION supabase_realtime FOR TABLE
        games, todos, profiles, student_progress, level_chats,
        direct_messages, internal_tasks, exam_attempts,
        lecture_task_submissions, notifications, assignment_overrides,
        parent_moderator_messages, parent_moderator_threads,
        calendar_events, student_activity_log;
COMMIT;


-- =============================================================
-- 8. ADDITIONAL INDEXES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_level_chats_lecture_id ON level_chats(lecture_id);
CREATE INDEX IF NOT EXISTS idx_task_submissions_status ON lecture_task_submissions(status);
CREATE INDEX IF NOT EXISTS idx_task_submissions_student_lecture ON lecture_task_submissions(student_id, lecture_id);
CREATE INDEX IF NOT EXISTS idx_assignment_overrides_student ON assignment_overrides(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_lectures_assignment ON lectures(assignment_required) WHERE assignment_required = true;
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
-- 2d. NORMALIZED CONTENT LIBRARY & GROUP-BASED LEVEL TEMPLATES
-- =============================================================

CREATE TABLE IF NOT EXISTS content_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('video', 'pdf', 'image', 'document', 'quiz', 'assignment')),
    storage_url TEXT NOT NULL,
    storage_path TEXT,
    file_hash TEXT,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_content_library_type ON content_library(file_type);
CREATE INDEX IF NOT EXISTS idx_content_library_hash ON content_library(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_library_created ON content_library(created_at DESC);

CREATE TABLE IF NOT EXISTS quiz_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 50,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    content_library_id UUID REFERENCES content_library(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
-- If groups table already existed without moderator_id, add it
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_id) WHERE group_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS level_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    level_order INTEGER NOT NULL,
    drip_interval_days INTEGER DEFAULT 7,
    is_published BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_level_templates_order ON level_templates(level_order);

CREATE TABLE IF NOT EXISTS lecture_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_template_id UUID REFERENCES level_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    pdf_url TEXT,
    slot_number INTEGER NOT NULL CHECK (slot_number >= 1 AND slot_number <= 200),
    drip_days INTEGER DEFAULT 7,
    is_live BOOLEAN DEFAULT true,
    is_big_exam BOOLEAN DEFAULT false,
    assignment_required BOOLEAN DEFAULT false,
    assignment_template_id UUID REFERENCES assignment_templates(id) ON DELETE SET NULL,
    content_blocks JSONB DEFAULT '[]',
    quiz_data JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(level_template_id, slot_number)
);
CREATE INDEX IF NOT EXISTS idx_lecture_templates_level ON lecture_templates(level_template_id);
CREATE INDEX IF NOT EXISTS idx_lecture_templates_slot ON lecture_templates(level_template_id, slot_number);
-- Ensure columns exist if table was created before
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS quiz_data JSONB DEFAULT '[]';
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS is_big_exam BOOLEAN DEFAULT false;
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS assignment_required BOOLEAN DEFAULT false;
ALTER TABLE lecture_templates ADD COLUMN IF NOT EXISTS assignment_template_id UUID REFERENCES assignment_templates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS group_level_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    level_template_id UUID REFERENCES level_templates(id) ON DELETE CASCADE,
    drip_override_days INTEGER,
    custom_title TEXT,
    assigned_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(group_id, level_template_id)
);
CREATE INDEX IF NOT EXISTS idx_group_level_group ON group_level_assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_group_level_template ON group_level_assignments(level_template_id);

CREATE TABLE IF NOT EXISTS exam_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_template_id UUID REFERENCES level_templates(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION find_content_by_hash(p_hash TEXT)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM content_library WHERE file_hash = p_hash LIMIT 1;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_level_templates(p_student_id UUID)
RETURNS TABLE (
    level_template_id UUID,
    title TEXT,
    description TEXT,
    image_url TEXT,
    level_order INTEGER,
    drip_interval_days INTEGER,
    drip_override_days INTEGER,
    is_published BOOLEAN,
    group_id UUID,
    group_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        lt.id,
        lt.title,
        lt.description,
        lt.image_url,
        lt.level_order,
        lt.drip_interval_days,
        gla.drip_override_days,
        lt.is_published,
        g.id,
        g.name
    FROM groups g
    JOIN profiles p ON p.group_id = g.id
    JOIN group_level_assignments gla ON gla.group_id = g.id
    JOIN level_templates lt ON lt.id = gla.level_template_id
    WHERE p.id = p_student_id
      AND lt.is_published = true
      AND lt.is_active = true
    ORDER BY lt.level_order ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_level_template_lectures(p_level_template_id UUID, p_student_id UUID DEFAULT NULL)
RETURNS TABLE (
    lecture_id UUID,
    title TEXT,
    description TEXT,
    slot_number INTEGER,
    drip_days INTEGER,
    is_live BOOLEAN,
    is_big_exam BOOLEAN,
    assignment_required BOOLEAN,
    video_url TEXT,
    pdf_url TEXT,
    content_blocks JSONB,
    quiz_data JSONB,
    is_completed BOOLEAN
) AS $$
DECLARE
    v_drip_override INTEGER;
BEGIN
    IF p_student_id IS NOT NULL THEN
        SELECT gla.drip_override_days INTO v_drip_override
        FROM group_level_assignments gla
        JOIN profiles p ON p.group_id = gla.group_id
        WHERE p.id = p_student_id AND gla.level_template_id = p_level_template_id;
    END IF;

    RETURN QUERY
    SELECT
        lt.id,
        lt.title,
        lt.description,
        lt.slot_number,
        COALESCE(v_drip_override, lt.drip_days),
        lt.is_live,
        lt.is_big_exam,
        lt.assignment_required,
        (SELECT cl.storage_url FROM jsonb_array_elements_text(lt.content_blocks) AS cb
         JOIN content_library cl ON cl.id::TEXT = cb
         WHERE cl.file_type = 'video' LIMIT 1),
        (SELECT cl.storage_url FROM jsonb_array_elements_text(lt.content_blocks) AS cb
         JOIN content_library cl ON cl.id::TEXT = cb
         WHERE cl.file_type = 'pdf' LIMIT 1),
        lt.content_blocks,
        COALESCE(
            (SELECT qt.questions FROM quiz_templates qt
             JOIN jsonb_array_elements_text(lt.content_blocks) AS cb ON qt.id::TEXT = cb
             LIMIT 1),
            '[]'::JSONB
        ),
        COALESCE(
            (SELECT EXISTS(
                SELECT 1 FROM student_progress sp
                WHERE sp.student_id = p_student_id AND sp.lecture_id = lt.id
            )),
            false
        )
    FROM lecture_templates lt
    WHERE lt.level_template_id = p_level_template_id
    ORDER BY lt.slot_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION migrate_to_normalized_architecture()
RETURNS TEXT AS $$
DECLARE
    v_level RECORD;
    v_lecture RECORD;
    v_block JSONB;
    v_block_text TEXT;
    v_content_id UUID;
    v_template_id UUID;
    v_quiz_id UUID;
    v_level_order INTEGER := 0;
    v_group RECORD;
    v_group_name TEXT;
    v_group_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
    FOR v_group_name IN SELECT DISTINCT group_name FROM profiles WHERE group_name IS NOT NULL AND group_name != ''
    LOOP
        INSERT INTO groups (name) VALUES (v_group_name)
        ON CONFLICT (name) DO NOTHING;
        v_group_names := array_append(v_group_names, v_group_name);
    END LOOP;

    UPDATE profiles p
    SET group_id = g.id
    FROM groups g
    WHERE p.group_name = g.name;

    FOR v_level IN SELECT * FROM levels ORDER BY level_order ASC
    LOOP
        v_level_order := v_level.level_order;

        INSERT INTO level_templates (title, image_url, level_order, drip_interval_days, is_published, created_by)
        VALUES (v_level.title, v_level.image_url, v_level_order, v_level.drip_interval_days, v_level.is_published, NULL)
        RETURNING id INTO v_template_id;

        FOR v_lecture IN SELECT * FROM lectures WHERE level_id = v_level.id ORDER BY slot_number ASC
        LOOP
            FOR v_block IN SELECT * FROM jsonb_array_elements(COALESCE(v_lecture.content_blocks, '[]'::JSONB))
            LOOP
                v_block_text := v_block->>'content';
                IF v_block_text IS NULL OR v_block_text = '' THEN CONTINUE; END IF;

                SELECT id INTO v_content_id FROM content_library WHERE storage_url = v_block_text LIMIT 1;

                IF v_content_id IS NULL THEN
                    INSERT INTO content_library (title, file_type, storage_url, storage_path, metadata)
                    VALUES (
                        COALESCE(v_block->'metadata'->>'filename', v_block->>'type', 'Untitled'),
                        CASE (v_block->>'type')
                            WHEN 'video' THEN 'video'
                            WHEN 'pdf' THEN 'pdf'
                            WHEN 'image' THEN 'image'
                            WHEN 'word' THEN 'document'
                            WHEN 'download' THEN 'document'
                            WHEN 'canvas' THEN 'video'
                            ELSE 'document'
                        END,
                        v_block_text,
                        NULL,
                        COALESCE(v_block->'metadata', '{}'::JSONB)
                    )
                    RETURNING id INTO v_content_id;
                END IF;
            END LOOP;

            IF v_lecture.video_url IS NOT NULL AND v_lecture.video_url != '' THEN
                SELECT id INTO v_content_id FROM content_library WHERE storage_url = v_lecture.video_url LIMIT 1;
                IF v_content_id IS NULL THEN
                    INSERT INTO content_library (title, file_type, storage_url)
                    VALUES ('Video: ' || v_lecture.title, 'video', v_lecture.video_url)
                    RETURNING id INTO v_content_id;
                END IF;
            END IF;

            IF v_lecture.pdf_url IS NOT NULL AND v_lecture.pdf_url != '' THEN
                SELECT id INTO v_content_id FROM content_library WHERE storage_url = v_lecture.pdf_url LIMIT 1;
                IF v_content_id IS NULL THEN
                    INSERT INTO content_library (title, file_type, storage_url)
                    VALUES ('PDF: ' || v_lecture.title, 'pdf', v_lecture.pdf_url)
                    RETURNING id INTO v_content_id;
                END IF;
            END IF;

            IF v_lecture.quiz_data IS NOT NULL AND jsonb_array_length(v_lecture.quiz_data) > 0 THEN
                INSERT INTO quiz_templates (title, questions, created_by)
                VALUES ('Quiz: ' || v_lecture.title, v_lecture.quiz_data, NULL)
                RETURNING id INTO v_quiz_id;
            ELSE
                v_quiz_id := NULL;
            END IF;

            INSERT INTO lecture_templates (
                level_template_id, title, description, slot_number, drip_days,
                is_live, is_big_exam, assignment_required, content_blocks
            ) VALUES (
                v_template_id,
                v_lecture.title,
                v_lecture.description,
                v_lecture.slot_number,
                COALESCE(v_lecture.drip_days, 7),
                v_lecture.is_live,
                v_lecture.is_big_exam,
                COALESCE(v_lecture.assignment_required, false),
                v_lecture.content_blocks
            );
        END LOOP;

        IF EXISTS (SELECT 1 FROM exams WHERE level_id = v_level.id) THEN
            INSERT INTO exam_templates (level_template_id, title, questions, passing_score)
            SELECT v_template_id, e.title, e.questions, e.passing_score
            FROM exams e WHERE e.level_id = v_level.id;
        END IF;
    END LOOP;

    FOR v_group IN SELECT DISTINCT g.id, g.name FROM groups g
        JOIN profiles p ON p.group_id = g.id
        JOIN level_access la ON la.user_id = p.id
    LOOP
        INSERT INTO group_level_assignments (group_id, level_template_id)
        SELECT DISTINCT v_group.id, lt.id
        FROM level_access la
        JOIN profiles p ON p.id = la.user_id AND p.group_id = v_group.id
        JOIN level_templates lt ON lt.level_order = (
            SELECT level_order FROM levels WHERE id = la.level_id
        )
        ON CONFLICT (group_id, level_template_id) DO NOTHING;
    END LOOP;

    FOR v_group IN SELECT DISTINCT g.id FROM groups g
        JOIN profiles p ON p.group_id = g.id
    LOOP
        INSERT INTO group_level_assignments (group_id, level_template_id)
        SELECT v_group.id, lt.id
        FROM level_templates lt
        WHERE lt.is_published = true
          AND NOT EXISTS (
              SELECT 1 FROM group_level_assignments gla
              WHERE gla.group_id = v_group.id AND gla.level_template_id = lt.id
          )
        ON CONFLICT (group_id, level_template_id) DO NOTHING;
    END LOOP;

    RETURN 'Migration complete. Groups: ' || array_length(v_group_names, 1) ||
           ', Levels: ' || (SELECT COUNT(*) FROM level_templates) ||
           ', Lectures: ' || (SELECT COUNT(*) FROM lecture_templates) ||
           ', Content: ' || (SELECT COUNT(*) FROM content_library);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage content" ON content_library;
CREATE POLICY "Moderators manage content" ON content_library FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view content" ON content_library;
CREATE POLICY "Authenticated users view content" ON content_library FOR SELECT USING (auth.uid() IS NOT NULL);
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage quiz templates" ON quiz_templates;
CREATE POLICY "Moderators manage quiz templates" ON quiz_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view quiz templates" ON quiz_templates;
CREATE POLICY "Authenticated users view quiz templates" ON quiz_templates FOR SELECT USING (auth.uid() IS NOT NULL);
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage assignment templates" ON assignment_templates;
CREATE POLICY "Moderators manage assignment templates" ON assignment_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view assignment templates" ON assignment_templates;
CREATE POLICY "Authenticated users view assignment templates" ON assignment_templates FOR SELECT USING (auth.uid() IS NOT NULL);
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage groups" ON groups;
CREATE POLICY "Moderators manage groups" ON groups FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Moderators view assigned groups" ON groups;
CREATE POLICY "Moderators view assigned groups" ON groups FOR SELECT USING (is_moderator() AND (moderator_id = auth.uid() OR is_admin()));
DROP POLICY IF EXISTS "Users view own group" ON groups;
CREATE POLICY "Users view own group" ON groups FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = groups.id) OR is_moderator());
ALTER TABLE level_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage level templates" ON level_templates;
CREATE POLICY "Moderators manage level templates" ON level_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned templates" ON level_templates;
CREATE POLICY "Students view assigned templates" ON level_templates FOR SELECT USING (is_moderator() OR (is_published = true AND EXISTS (SELECT 1 FROM group_level_assignments gla WHERE gla.level_template_id = level_templates.id AND is_member_of_group(gla.group_id))));
ALTER TABLE lecture_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage lecture templates" ON lecture_templates;
CREATE POLICY "Moderators manage lecture templates" ON lecture_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned lectures" ON lecture_templates;
CREATE POLICY "Students view assigned lectures" ON lecture_templates FOR SELECT USING (is_moderator() OR EXISTS (SELECT 1 FROM level_templates lt JOIN group_level_assignments gla ON gla.level_template_id = lt.id WHERE lt.id = lecture_templates.level_template_id AND lt.is_published = true AND is_member_of_group(gla.group_id)));
ALTER TABLE group_level_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage group assignments" ON group_level_assignments;
CREATE POLICY "Moderators manage group assignments" ON group_level_assignments FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Moderators view own group assignments" ON group_level_assignments;
CREATE POLICY "Moderators view own group assignments" ON group_level_assignments FOR SELECT USING (is_moderator() AND (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_level_assignments.group_id AND groups.moderator_id = auth.uid()) OR is_admin()));
DROP POLICY IF EXISTS "Students view own group assignments" ON group_level_assignments;
CREATE POLICY "Students view own group assignments" ON group_level_assignments FOR SELECT USING (is_member_of_group(group_level_assignments.group_id));
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage exam templates" ON exam_templates;
CREATE POLICY "Moderators manage exam templates" ON exam_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned exams" ON exam_templates;
CREATE POLICY "Students view assigned exams" ON exam_templates FOR SELECT USING (is_moderator() OR EXISTS (SELECT 1 FROM level_templates lt JOIN group_level_assignments gla ON gla.level_template_id = lt.id WHERE lt.id = exam_templates.level_template_id AND lt.is_published = true AND is_member_of_group(gla.group_id)));
ALTER PUBLICATION supabase_realtime ADD TABLE content_library;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_level_assignments;

CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, created_at DESC);
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage group messages" ON group_messages;
CREATE POLICY "Moderators manage group messages" ON group_messages FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Group members view messages" ON group_messages;
CREATE POLICY "Group members view messages" ON group_messages FOR SELECT USING (is_moderator() OR is_member_of_group(group_messages.group_id));
DROP POLICY IF EXISTS "Group members send messages" ON group_messages;
CREATE POLICY "Group members send messages" ON group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND (is_moderator() OR is_member_of_group(group_messages.group_id)));
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
