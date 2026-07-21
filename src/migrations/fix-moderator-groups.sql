-- =============================================================
-- FIX: Add moderator_id to groups + all normalized tables
-- Safe to run: uses IF NOT EXISTS everywhere
-- =============================================================

-- 1. HELPER FUNCTIONS
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (role = 'admin' OR is_admin = true)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_moderator()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'moderator')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (is_approved = true OR role IN ('admin', 'moderator'))
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ADD MODERATOR_ID TO GROUPS
----------------------------------------------------------------
ALTER TABLE groups ADD COLUMN IF NOT EXISTS moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 3. ADD group_id TO PROFILES (if not already there)
----------------------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_id) WHERE group_id IS NOT NULL;

-- 4. CONTENT LIBRARY TABLES
----------------------------------------------------------------
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

-- 5. NORMALIZED TABLES
----------------------------------------------------------------
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
    is_published BOOLEAN DEFAULT true,
    assignment_required BOOLEAN DEFAULT false,
    assignment_template_id UUID REFERENCES assignment_templates(id) ON DELETE SET NULL,
    content_blocks JSONB DEFAULT '[]',
    quiz_data JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(level_template_id, slot_number)
);
CREATE INDEX IF NOT EXISTS idx_lecture_templates_level ON lecture_templates(level_template_id);

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

CREATE TABLE IF NOT EXISTS exam_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_template_id UUID REFERENCES level_templates(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id, created_at DESC);

-- 6. RLS POLICIES
----------------------------------------------------------------

-- Groups RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage groups" ON groups;
CREATE POLICY "Moderators manage groups" ON groups FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Moderators view assigned groups" ON groups;
CREATE POLICY "Moderators view assigned groups" ON groups FOR SELECT USING (is_moderator() AND (moderator_id = auth.uid() OR is_admin()));
DROP POLICY IF EXISTS "Users view own group" ON groups;
CREATE POLICY "Users view own group" ON groups FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = groups.id) OR is_moderator());

-- Level Templates RLS
ALTER TABLE level_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage level templates" ON level_templates;
CREATE POLICY "Moderators manage level templates" ON level_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned templates" ON level_templates;
CREATE POLICY "Students view assigned templates" ON level_templates FOR SELECT USING (is_moderator() OR (is_published = true AND EXISTS (SELECT 1 FROM group_level_assignments gla JOIN profiles p ON p.group_id = gla.group_id WHERE p.id = auth.uid() AND gla.level_template_id = level_templates.id)));

-- Lecture Templates RLS
ALTER TABLE lecture_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage lecture templates" ON lecture_templates;
CREATE POLICY "Moderators manage lecture templates" ON lecture_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned lectures" ON lecture_templates;
CREATE POLICY "Students view assigned lectures" ON lecture_templates FOR SELECT USING (is_moderator() OR EXISTS (SELECT 1 FROM level_templates lt JOIN group_level_assignments gla ON gla.level_template_id = lt.id JOIN profiles p ON p.group_id = gla.group_id WHERE lt.id = lecture_templates.level_template_id AND p.id = auth.uid() AND lt.is_published = true));

-- Group Level Assignments RLS
ALTER TABLE group_level_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage group assignments" ON group_level_assignments;
CREATE POLICY "Moderators manage group assignments" ON group_level_assignments FOR ALL USING (is_admin());
DROP POLICY IF EXISTS "Moderators view own group assignments" ON group_level_assignments;
CREATE POLICY "Moderators view own group assignments" ON group_level_assignments FOR SELECT USING (is_moderator() AND (EXISTS (SELECT 1 FROM groups WHERE groups.id = group_level_assignments.group_id AND groups.moderator_id = auth.uid()) OR is_admin()));
DROP POLICY IF EXISTS "Students view own group assignments" ON group_level_assignments;
CREATE POLICY "Students view own group assignments" ON group_level_assignments FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = group_level_assignments.group_id));

-- Exam Templates RLS
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage exam templates" ON exam_templates;
CREATE POLICY "Moderators manage exam templates" ON exam_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned exams" ON exam_templates;
CREATE POLICY "Students view assigned exams" ON exam_templates FOR SELECT USING (is_moderator() OR EXISTS (SELECT 1 FROM level_templates lt JOIN group_level_assignments gla ON gla.level_template_id = lt.id JOIN profiles p ON p.group_id = gla.group_id WHERE lt.id = exam_templates.level_template_id AND p.id = auth.uid() AND lt.is_published = true));

-- Content Library RLS
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage content" ON content_library;
CREATE POLICY "Moderators manage content" ON content_library FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view content" ON content_library;
CREATE POLICY "Authenticated users view content" ON content_library FOR SELECT USING (auth.uid() IS NOT NULL);

-- Quiz Templates RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage quiz templates" ON quiz_templates;
CREATE POLICY "Moderators manage quiz templates" ON quiz_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view quiz templates" ON quiz_templates;
CREATE POLICY "Authenticated users view quiz templates" ON quiz_templates FOR SELECT USING (auth.uid() IS NOT NULL);

-- Assignment Templates RLS
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage assignment templates" ON assignment_templates;
CREATE POLICY "Moderators manage assignment templates" ON assignment_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view assignment templates" ON assignment_templates;
CREATE POLICY "Authenticated users view assignment templates" ON assignment_templates FOR SELECT USING (auth.uid() IS NOT NULL);

-- Group Messages RLS
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage group messages" ON group_messages;
CREATE POLICY "Moderators manage group messages" ON group_messages FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Group members view messages" ON group_messages;
CREATE POLICY "Group members view messages" ON group_messages FOR SELECT USING (is_moderator() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = group_messages.group_id));
DROP POLICY IF EXISTS "Group members send messages" ON group_messages;
CREATE POLICY "Group members send messages" ON group_messages FOR INSERT WITH CHECK (auth.uid() = sender_id AND (is_moderator() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = group_messages.group_id)));

-- 7. REALTIME
----------------------------------------------------------------
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE groups;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE group_level_assignments;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 8. DEDUP FUNCTION
----------------------------------------------------------------
CREATE OR REPLACE FUNCTION find_content_by_hash(p_hash TEXT)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM content_library WHERE file_hash = p_hash LIMIT 1;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
