-- =============================================================
-- NORMALIZED CONTENT LIBRARY & GROUP-BASED LEVEL TEMPLATES
-- Migration: normalized-content-library.sql
-- =============================================================
-- Architecture:
--   1. Content Library: Upload once, reference everywhere
--   2. Level Templates: Reusable course structures
--   3. Groups: Students assigned to groups, each group gets a level template
--   4. Lecture Templates: Reference content library items by FK
-- =============================================================

-- =============================================================
-- 1. CONTENT LIBRARY
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

-- =============================================================
-- 2. QUIZ TEMPLATES
-- =============================================================

CREATE TABLE IF NOT EXISTS quiz_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 50,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =============================================================
-- 3. ASSIGNMENT TEMPLATES
-- =============================================================

CREATE TABLE IF NOT EXISTS assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    content_library_id UUID REFERENCES content_library(id) ON DELETE SET NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =============================================================
-- 4. GROUPS
-- =============================================================

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- Add group_id to profiles for direct FK reference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_group ON profiles(group_id) WHERE group_id IS NOT NULL;

-- =============================================================
-- 5. LEVEL TEMPLATES (reusable, assignable to many groups)
-- =============================================================

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

-- =============================================================
-- 6. LECTURE TEMPLATES (lectures within a level template)
-- =============================================================

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

-- =============================================================
-- 7. GROUP-LEVEL ASSIGNMENTS (many-to-many)
-- =============================================================

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

-- =============================================================
-- 8. EXAM TEMPLATES (for level template exams)
-- =============================================================

CREATE TABLE IF NOT EXISTS exam_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_template_id UUID REFERENCES level_templates(id) ON DELETE CASCADE UNIQUE,
    title TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]',
    passing_score INTEGER DEFAULT 70,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =============================================================
-- 9. RPC FUNCTIONS
-- =============================================================

-- Dedup check: find existing content by hash
CREATE OR REPLACE FUNCTION find_content_by_hash(p_hash TEXT)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM content_library WHERE file_hash = p_hash LIMIT 1;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a level template with its lecture templates in one call
CREATE OR REPLACE FUNCTION create_level_template_with_lectures(
    p_title TEXT,
    p_description TEXT,
    p_image_url TEXT,
    p_level_order INTEGER,
    p_drip_interval_days INTEGER,
    p_is_published BOOLEAN,
    p_lectures JSONB
) RETURNS UUID AS $$
DECLARE
    v_template_id UUID;
    v_lecture JSONB;
BEGIN
    INSERT INTO level_templates (title, description, image_url, level_order, drip_interval_days, is_published, created_by)
    VALUES (p_title, p_description, p_image_url, p_level_order, p_drip_interval_days, p_is_published, auth.uid())
    RETURNING id INTO v_template_id;

    FOR v_lecture IN SELECT * FROM jsonb_array_elements(p_lectures)
    LOOP
        INSERT INTO lecture_templates (
            level_template_id, title, description, slot_number, drip_days,
            is_live, is_big_exam, assignment_required, assignment_template_id, content_blocks
        ) VALUES (
            v_template_id,
            v_lecture->>'title',
            v_lecture->>'description',
            (v_lecture->>'slot_number')::INTEGER,
            COALESCE((v_lecture->>'drip_days')::INTEGER, 7),
            COALESCE((v_lecture->>'is_live')::BOOLEAN, true),
            COALESCE((v_lecture->>'is_big_exam')::BOOLEAN, false),
            COALESCE((v_lecture->>'assignment_required')::BOOLEAN, false),
            NULLIF(v_lecture->>'assignment_template_id', '')::UUID,
            COALESCE(v_lecture->'content_blocks', '[]'::JSONB)
        );
    END LOOP;

    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign a level template to a group
CREATE OR REPLACE FUNCTION assign_level_to_group(
    p_group_id UUID,
    p_level_template_id UUID,
    p_drip_override_days INTEGER DEFAULT NULL,
    p_custom_title TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO group_level_assignments (group_id, level_template_id, drip_override_days, custom_title)
    VALUES (p_group_id, p_level_template_id, p_drip_override_days, p_custom_title)
    ON CONFLICT (group_id, level_template_id) DO UPDATE SET
        drip_override_days = p_drip_override_days,
        custom_title = p_custom_title;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove a level template from a group
CREATE OR REPLACE FUNCTION remove_level_from_group(
    p_group_id UUID,
    p_level_template_id UUID
) RETURNS VOID AS $$
BEGIN
    DELETE FROM group_level_assignments
    WHERE group_id = p_group_id AND level_template_id = p_level_template_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get the level templates assigned to a student's group
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
        lt.id AS level_template_id,
        lt.title,
        lt.description,
        lt.image_url,
        lt.level_order,
        lt.drip_interval_days,
        gla.drip_override_days,
        lt.is_published,
        g.id AS group_id,
        g.name AS group_name
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

-- Get lectures for a level template (with drip override from group assignment)
CREATE OR REPLACE FUNCTION get_level_template_lectures(
    p_level_template_id UUID,
    p_student_id UUID DEFAULT NULL
) RETURNS TABLE (
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
    -- Check if student's group has a drip override
    IF p_student_id IS NOT NULL THEN
        SELECT gla.drip_override_days INTO v_drip_override
        FROM group_level_assignments gla
        JOIN profiles p ON p.group_id = gla.group_id
        WHERE p.id = p_student_id AND gla.level_template_id = p_level_template_id;
    END IF;

    RETURN QUERY
    SELECT
        lt.id AS lecture_id,
        lt.title,
        lt.description,
        lt.slot_number,
        COALESCE(v_drip_override, lt.drip_days) AS drip_days,
        lt.is_live,
        lt.is_big_exam,
        lt.assignment_required,
        -- Extract video/pdf URLs from content_blocks for backward compatibility
        (SELECT cl.storage_url FROM jsonb_array_elements_text(lt.content_blocks) AS cb
         JOIN content_library cl ON cl.id::TEXT = cb
         WHERE cl.file_type = 'video' LIMIT 1) AS video_url,
        (SELECT cl.storage_url FROM jsonb_array_elements_text(lt.content_blocks) AS cb
         JOIN content_library cl ON cl.id::TEXT = cb
         WHERE cl.file_type = 'pdf' LIMIT 1) AS pdf_url,
        lt.content_blocks,
        COALESCE(
            (SELECT qt.questions FROM quiz_templates qt
             JOIN jsonb_array_elements_text(lt.content_blocks) AS cb ON qt.id::TEXT = cb
             LIMIT 1),
            '[]'::JSONB
        ) AS quiz_data,
        -- Check completion if student provided
        COALESCE(
            (SELECT EXISTS(
                SELECT 1 FROM student_progress sp
                WHERE sp.student_id = p_student_id AND sp.lecture_id = lt.id
            )),
            false
        ) AS is_completed
    FROM lecture_templates lt
    WHERE lt.level_template_id = p_level_template_id
    ORDER BY lt.slot_number ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all content from the library with usage counts
CREATE OR REPLACE FUNCTION get_content_library_with_usage()
RETURNS TABLE (
    id UUID,
    title TEXT,
    file_type TEXT,
    storage_url TEXT,
    file_hash TEXT,
    file_size BIGINT,
    mime_type TEXT,
    metadata JSONB,
    usage_count BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.id,
        cl.title,
        cl.file_type,
        cl.storage_url,
        cl.file_hash,
        cl.file_size,
        cl.mime_type,
        cl.metadata,
        (SELECT COUNT(*) FROM lecture_templates lt
         WHERE lt.content_blocks @> to_jsonb(cl.id::TEXT)) AS usage_count,
        cl.created_at
    FROM content_library cl
    ORDER BY cl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- 10. DATA MIGRATION: Populate new tables from existing data
-- =============================================================

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
    v_slot INTEGER;
    v_student RECORD;
    v_group RECORD;
    v_group_name TEXT;
    v_group_names TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- 1. Create groups from distinct group_name values in profiles
    FOR v_group_name IN SELECT DISTINCT group_name FROM profiles WHERE group_name IS NOT NULL AND group_name != ''
    LOOP
        INSERT INTO groups (name) VALUES (v_group_name)
        ON CONFLICT (name) DO NOTHING;
        v_group_names := array_append(v_group_names, v_group_name);
    END LOOP;

    -- 2. Assign students to their groups via group_id FK
    UPDATE profiles p
    SET group_id = g.id
    FROM groups g
    WHERE p.group_name = g.name;

    -- 3. Migrate existing levels to level_templates
    FOR v_level IN SELECT * FROM levels ORDER BY level_order ASC
    LOOP
        v_level_order := v_level.level_order;

        INSERT INTO level_templates (title, image_url, level_order, drip_interval_days, is_published, created_by)
        VALUES (v_level.title, v_level.image_url, v_level_order, v_level.drip_interval_days, v_level.is_published, NULL)
        RETURNING id INTO v_template_id;

        -- Migrate lectures for this level
        FOR v_lecture IN SELECT * FROM lectures WHERE level_id = v_level.id ORDER BY slot_number ASC
        LOOP
            -- Migrate content_blocks: extract media URLs to content_library
            FOR v_block IN SELECT * FROM jsonb_array_elements(COALESCE(v_lecture.content_blocks, '[]'::JSONB))
            LOOP
                v_block_text := v_block->>'content';
                IF v_block_text IS NULL OR v_block_text = '' THEN CONTINUE; END IF;

                -- Check if URL already exists in library
                SELECT id INTO v_content_id FROM content_library WHERE storage_url = v_block_text LIMIT 1;

                IF v_content_id IS NULL THEN
                    -- Determine file_type from block type
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

                -- Replace the block's content with the content_library ID
                -- Keep the original structure but reference by ID
            END LOOP;

            -- Migrate video_url to content_library
            IF v_lecture.video_url IS NOT NULL AND v_lecture.video_url != '' THEN
                SELECT id INTO v_content_id FROM content_library WHERE storage_url = v_lecture.video_url LIMIT 1;
                IF v_content_id IS NULL THEN
                    INSERT INTO content_library (title, file_type, storage_url)
                    VALUES ('Video: ' || v_lecture.title, 'video', v_lecture.video_url)
                    RETURNING id INTO v_content_id;
                END IF;
            END IF;

            -- Migrate pdf_url to content_library
            IF v_lecture.pdf_url IS NOT NULL AND v_lecture.pdf_url != '' THEN
                SELECT id INTO v_content_id FROM content_library WHERE storage_url = v_lecture.pdf_url LIMIT 1;
                IF v_content_id IS NULL THEN
                    INSERT INTO content_library (title, file_type, storage_url)
                    VALUES ('PDF: ' || v_lecture.title, 'pdf', v_lecture.pdf_url)
                    RETURNING id INTO v_content_id;
                END IF;
            END IF;

            -- Migrate quiz_data to quiz_templates
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

        -- Migrate exam to exam_templates
        IF EXISTS (SELECT 1 FROM exams WHERE level_id = v_level.id) THEN
            INSERT INTO exam_templates (level_template_id, title, questions, passing_score)
            SELECT v_template_id, e.title, e.questions, e.passing_score
            FROM exams e WHERE e.level_id = v_level.id;
        END IF;
    END LOOP;

    -- 4. Assign level templates to groups based on existing level_access
    -- If a student has level_access and is in a group, assign the level template to that group
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

    -- For students without level_access but in groups, assign all published levels
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

-- =============================================================
-- 11. RLS POLICIES
-- =============================================================

-- content_library
ALTER TABLE content_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage content" ON content_library;
CREATE POLICY "Moderators manage content" ON content_library FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view content" ON content_library;
CREATE POLICY "Authenticated users view content" ON content_library FOR SELECT USING (auth.uid() IS NOT NULL);

-- quiz_templates
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage quizzes" ON quiz_templates;
CREATE POLICY "Moderators manage quizzes" ON quiz_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view quizzes" ON quiz_templates;
CREATE POLICY "Authenticated users view quizzes" ON quiz_templates FOR SELECT USING (auth.uid() IS NOT NULL);

-- assignment_templates
ALTER TABLE assignment_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage assignments" ON assignment_templates;
CREATE POLICY "Moderators manage assignments" ON assignment_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Authenticated users view assignments" ON assignment_templates;
CREATE POLICY "Authenticated users view assignments" ON assignment_templates FOR SELECT USING (auth.uid() IS NOT NULL);

-- groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage groups" ON groups;
CREATE POLICY "Moderators manage groups" ON groups FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Users view own group" ON groups;
CREATE POLICY "Users view own group" ON groups FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = groups.id)
    OR is_moderator()
);

-- level_templates
ALTER TABLE level_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage level templates" ON level_templates;
CREATE POLICY "Moderators manage level templates" ON level_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned templates" ON level_templates;
CREATE POLICY "Students view assigned templates" ON level_templates FOR SELECT USING (
    is_moderator() OR (
        is_published = true AND EXISTS (
            SELECT 1 FROM group_level_assignments gla
            JOIN profiles p ON p.group_id = gla.group_id
            WHERE p.id = auth.uid() AND gla.level_template_id = level_templates.id
        )
    )
);

-- lecture_templates
ALTER TABLE lecture_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage lecture templates" ON lecture_templates;
CREATE POLICY "Moderators manage lecture templates" ON lecture_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned lectures" ON lecture_templates;
CREATE POLICY "Students view assigned lectures" ON lecture_templates FOR SELECT USING (
    is_moderator() OR EXISTS (
        SELECT 1 FROM level_templates lt
        JOIN group_level_assignments gla ON gla.level_template_id = lt.id
        JOIN profiles p ON p.group_id = gla.group_id
        WHERE lt.id = lecture_templates.level_template_id
          AND p.id = auth.uid()
          AND lt.is_published = true
    )
);

-- group_level_assignments
ALTER TABLE group_level_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage group assignments" ON group_level_assignments;
CREATE POLICY "Moderators manage group assignments" ON group_level_assignments FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view own group assignments" ON group_level_assignments;
CREATE POLICY "Students view own group assignments" ON group_level_assignments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.group_id = group_level_assignments.group_id
    )
);

-- exam_templates
ALTER TABLE exam_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Moderators manage exam templates" ON exam_templates;
CREATE POLICY "Moderators manage exam templates" ON exam_templates FOR ALL USING (is_moderator());
DROP POLICY IF EXISTS "Students view assigned exams" ON exam_templates;
CREATE POLICY "Students view assigned exams" ON exam_templates FOR SELECT USING (
    is_moderator() OR EXISTS (
        SELECT 1 FROM level_templates lt
        JOIN group_level_assignments gla ON gla.level_template_id = lt.id
        JOIN profiles p ON p.group_id = gla.group_id
        WHERE lt.id = exam_templates.level_template_id
          AND p.id = auth.uid()
          AND lt.is_published = true
    )
);

-- =============================================================
-- 12. REALTIME
-- =============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE content_library;
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_level_assignments;
