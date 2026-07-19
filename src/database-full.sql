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
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
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
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
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
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Exam Analytics
CREATE TABLE IF NOT EXISTS exam_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
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
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
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
    lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (student_id, lecture_id)
);

-- Level Access: Whitelist for specific users (manual override)
CREATE TABLE IF NOT EXISTS level_access (
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, level_id)
);

-- Level Chats: Classroom communication
CREATE TABLE IF NOT EXISTS level_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
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
      -- 1. If user has manual access to THIS specific level, grant it immediately
      IF EXISTS (SELECT 1 FROM level_access WHERE user_id = u_id AND level_id = target_level_id) THEN
        RETURN TRUE;
      END IF;

      -- 2. Check if user has ANY manual access records to other levels
      SELECT EXISTS (SELECT 1 FROM level_access WHERE user_id = u_id) INTO has_manual;
      
      SELECT level_order INTO current_level_order FROM levels WHERE id = target_level_id;
      
      -- 3. If it's level 1, only auto-grant if NO manual access exists at all for this user
      IF current_level_order = 1 THEN 
        IF has_manual THEN
          RETURN FALSE; -- If admin made any choice, default Level 1 is disabled
        ELSE
          RETURN TRUE; -- Standard start for new users
        END IF;
      END IF;

      -- 4. If they have ANY manual access, they are in "Admin Choice" mode and defaults are disabled
      IF has_manual THEN
        RETURN FALSE;
      END IF;

      -- 5. Sequential progression logic for non-manual users
      SELECT id INTO prev_level_id FROM levels WHERE level_order < current_level_order ORDER BY level_order DESC LIMIT 1;
      IF prev_level_id IS NULL THEN RETURN TRUE; END IF;
      
      SELECT COUNT(*) INTO lectures_count FROM lectures WHERE level_id = prev_level_id AND is_live IS NOT FALSE;
      SELECT COUNT(*) INTO completed_count FROM student_progress JOIN lectures ON student_progress.lecture_id = lectures.id WHERE student_progress.student_id = u_id AND lectures.level_id = prev_level_id;
      
      RETURN completed_count >= lectures_count;
    END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enforce sequential lecture access within a level
CREATE OR REPLACE FUNCTION can_access_lecture(p_lecture_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_level_id UUID;
    v_slot_number INTEGER;
    v_drip_interval INTEGER;
    v_level_access_granted_at TIMESTAMP WITH TIME ZONE;
    v_incomplete_count INTEGER;
BEGIN
    IF is_moderator() THEN RETURN TRUE; END IF;

    SELECT level_id, slot_number INTO v_level_id, v_slot_number FROM lectures WHERE id = p_lecture_id;

    IF NOT has_level_access(v_level_id) THEN RETURN FALSE; END IF;

    -- Drip Logic: Check when level access was granted
    SELECT granted_at INTO v_level_access_granted_at 
    FROM level_access 
    WHERE user_id = auth.uid() AND level_id = v_level_id;

    -- If no record in level_access, default to NOW()
    IF v_level_access_granted_at IS NULL THEN
        v_level_access_granted_at := NOW();
    END IF;

    SELECT drip_interval_days INTO v_drip_interval FROM levels WHERE id = v_level_id;
    v_drip_interval := COALESCE(v_drip_interval, 7);

    -- Each slot is unlocked after (slot-1) * drip_interval days
    IF (v_slot_number - 1) * v_drip_interval > EXTRACT(DAY FROM (NOW() - v_level_access_granted_at)) THEN
        RETURN FALSE;
    END IF;

    IF v_slot_number = 1 THEN RETURN TRUE; END IF;

    -- Check completion of previous lectures in this level
    SELECT COUNT(*) INTO v_incomplete_count
    FROM lectures l
    LEFT JOIN student_progress sp ON l.id = sp.lecture_id AND sp.student_id = auth.uid()
    WHERE l.level_id = v_level_id
      AND l.slot_number < v_slot_number
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

-- 4. SECURITY POLICIES (RLS)
----------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "View chat" ON level_chats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Post chat" ON level_chats;
CREATE POLICY "Post chat" ON level_chats FOR INSERT WITH CHECK (auth.uid() = sender_id);
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

-- 8. PER-LECTURE CHAT ROOMS
-- Adds lecture_id to level_chats so each lecture can have its own chat thread.
-- Existing messages (lecture_id = NULL) remain as level-wide classroom chat.
----------------------------------------------------------------
ALTER TABLE level_chats ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES lectures(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_level_chats_lecture_id ON level_chats(lecture_id);

