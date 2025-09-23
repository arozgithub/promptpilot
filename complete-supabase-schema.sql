-- ================================================================
-- COMPLETE SQL SCHEMA FOR PROMPT VERSION CONTROL SYSTEM
-- ================================================================
-- Run this entire script in your Supabase SQL Editor
-- This creates all tables, indexes, triggers, and security policies

-- ================================================================
-- 1. EXTENSIONS AND SETUP
-- ================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- 2. CORE TABLES
-- ================================================================

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS prompt_versions CASCADE;
DROP TABLE IF EXISTS prompt_groups CASCADE;

-- Create prompt_groups table
CREATE TABLE prompt_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Additional metadata
    tags TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT prompt_groups_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create prompt_versions table
CREATE TABLE prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES prompt_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'current', 'production')) DEFAULT 'draft',
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Additional metadata
    description TEXT,
    parent_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    author_notes TEXT,
    performance_score DECIMAL(3,2), -- For tracking version performance (0.00 to 1.00)
    usage_count INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT prompt_versions_name_not_empty CHECK (length(trim(name)) > 0),
    CONSTRAINT prompt_versions_content_not_empty CHECK (length(trim(content)) > 0),
    CONSTRAINT prompt_versions_version_positive CHECK (version_number > 0),
    CONSTRAINT prompt_versions_performance_valid CHECK (performance_score IS NULL OR (performance_score >= 0 AND performance_score <= 1))
);

-- ================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ================================================================

-- Indexes for prompt_groups
CREATE INDEX IF NOT EXISTS idx_prompt_groups_user_id ON prompt_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_groups_created_at ON prompt_groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_groups_updated_at ON prompt_groups(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_groups_name ON prompt_groups(name);
CREATE INDEX IF NOT EXISTS idx_prompt_groups_archived ON prompt_groups(is_archived) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_prompt_groups_tags ON prompt_groups USING GIN(tags);

-- Indexes for prompt_versions
CREATE INDEX IF NOT EXISTS idx_prompt_versions_group_id ON prompt_versions(group_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_status ON prompt_versions(status);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON prompt_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_updated_at ON prompt_versions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_version_number ON prompt_versions(group_id, version_number);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_parent ON prompt_versions(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_performance ON prompt_versions(performance_score DESC) WHERE performance_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompt_versions_archived ON prompt_versions(is_archived) WHERE is_archived = FALSE;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_prompt_versions_group_status ON prompt_versions(group_id, status);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_group_created ON prompt_versions(group_id, created_at DESC);

-- ================================================================
-- 4. TRIGGERS AND FUNCTIONS
-- ================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to auto-increment version numbers
CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.version_number IS NULL OR NEW.version_number = 1 THEN
        SELECT COALESCE(MAX(version_number), 0) + 1 
        INTO NEW.version_number 
        FROM prompt_versions 
        WHERE group_id = NEW.group_id;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to ensure only one current/production version per group
CREATE OR REPLACE FUNCTION enforce_single_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting to current or production, update other versions to draft
    IF NEW.status IN ('current', 'production') THEN
        UPDATE prompt_versions 
        SET status = 'draft', updated_at = NOW()
        WHERE group_id = NEW.group_id 
        AND id != NEW.id 
        AND status = NEW.status;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for prompt_groups
CREATE TRIGGER update_prompt_groups_updated_at 
    BEFORE UPDATE ON prompt_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for prompt_versions
CREATE TRIGGER update_prompt_versions_updated_at 
    BEFORE UPDATE ON prompt_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_prompt_version_number 
    BEFORE INSERT ON prompt_versions 
    FOR EACH ROW EXECUTE FUNCTION set_version_number();

CREATE TRIGGER enforce_single_status_trigger 
    BEFORE INSERT OR UPDATE ON prompt_versions 
    FOR EACH ROW EXECUTE FUNCTION enforce_single_status();

-- ================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================

-- Enable RLS on both tables
ALTER TABLE prompt_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own prompt groups" ON prompt_groups;
DROP POLICY IF EXISTS "Users can insert their own prompt groups" ON prompt_groups;
DROP POLICY IF EXISTS "Users can update their own prompt groups" ON prompt_groups;
DROP POLICY IF EXISTS "Users can delete their own prompt groups" ON prompt_groups;
DROP POLICY IF EXISTS "Users can view versions of their groups" ON prompt_versions;
DROP POLICY IF EXISTS "Users can insert versions to their groups" ON prompt_versions;
DROP POLICY IF EXISTS "Users can update versions of their groups" ON prompt_versions;
DROP POLICY IF EXISTS "Users can delete versions of their groups" ON prompt_versions;

-- Policies for prompt_groups
CREATE POLICY "Users can view their own prompt groups" ON prompt_groups
    FOR SELECT USING (
        auth.uid() = user_id OR 
        user_id IS NULL OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can insert their own prompt groups" ON prompt_groups
    FOR INSERT WITH CHECK (
        auth.uid() = user_id OR 
        user_id IS NULL OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can update their own prompt groups" ON prompt_groups
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        user_id IS NULL OR 
        auth.role() = 'service_role'
    );

CREATE POLICY "Users can delete their own prompt groups" ON prompt_groups
    FOR DELETE USING (
        auth.uid() = user_id OR 
        user_id IS NULL OR 
        auth.role() = 'service_role'
    );

-- Policies for prompt_versions (inherit from group ownership)
CREATE POLICY "Users can view versions of their groups" ON prompt_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (
                prompt_groups.user_id = auth.uid() OR 
                prompt_groups.user_id IS NULL OR 
                auth.role() = 'service_role'
            )
        )
    );

CREATE POLICY "Users can insert versions to their groups" ON prompt_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (
                prompt_groups.user_id = auth.uid() OR 
                prompt_groups.user_id IS NULL OR 
                auth.role() = 'service_role'
            )
        )
    );

CREATE POLICY "Users can update versions of their groups" ON prompt_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (
                prompt_groups.user_id = auth.uid() OR 
                prompt_groups.user_id IS NULL OR 
                auth.role() = 'service_role'
            )
        )
    );

CREATE POLICY "Users can delete versions of their groups" ON prompt_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (
                prompt_groups.user_id = auth.uid() OR 
                prompt_groups.user_id IS NULL OR 
                auth.role() = 'service_role'
            )
        )
    );

-- ================================================================
-- 6. USEFUL VIEWS
-- ================================================================

-- View to get prompt groups with their current and production versions
CREATE OR REPLACE VIEW prompt_groups_with_versions AS
SELECT 
    pg.id,
    pg.name,
    pg.description,
    pg.created_at,
    pg.updated_at,
    pg.user_id,
    pg.tags,
    pg.is_archived,
    pg.sort_order,
    
    -- Current version info
    cv.id as current_version_id,
    cv.name as current_version_name,
    cv.content as current_version_content,
    cv.version_number as current_version_number,
    
    -- Production version info
    pv.id as production_version_id,
    pv.name as production_version_name,
    pv.content as production_version_content,
    pv.version_number as production_version_number,
    
    -- Stats
    (SELECT COUNT(*) FROM prompt_versions WHERE group_id = pg.id AND is_archived = FALSE) as total_versions,
    (SELECT COUNT(*) FROM prompt_versions WHERE group_id = pg.id AND status = 'draft' AND is_archived = FALSE) as draft_versions
    
FROM prompt_groups pg
LEFT JOIN prompt_versions cv ON pg.id = cv.group_id AND cv.status = 'current' AND cv.is_archived = FALSE
LEFT JOIN prompt_versions pv ON pg.id = pv.group_id AND pv.status = 'production' AND pv.is_archived = FALSE
WHERE pg.is_archived = FALSE;

-- ================================================================
-- 7. SAMPLE DATA (OPTIONAL - Remove if not needed)
-- ================================================================

-- Insert sample prompt groups
INSERT INTO prompt_groups (name, description, user_id, tags) VALUES 
    ('Customer Support Bot', 'Prompts for customer support chatbot interactions', NULL, ARRAY['support', 'chatbot', 'customer-service']),
    ('Content Generation', 'Prompts for generating marketing and blog content', NULL, ARRAY['content', 'marketing', 'writing']),
    ('Code Assistant', 'Prompts for helping with programming tasks', NULL, ARRAY['programming', 'code', 'development']),
    ('Data Analysis', 'Prompts for analyzing data and generating insights', NULL, ARRAY['data', 'analysis', 'insights'])
ON CONFLICT DO NOTHING;

-- Insert sample versions for each group
WITH sample_groups AS (
    SELECT id, name FROM prompt_groups 
    WHERE name IN ('Customer Support Bot', 'Content Generation', 'Code Assistant', 'Data Analysis')
)
INSERT INTO prompt_versions (group_id, name, content, status, description, performance_score)
SELECT 
    sg.id,
    CASE 
        WHEN sg.name = 'Customer Support Bot' THEN 'Friendly Support Agent v1'
        WHEN sg.name = 'Content Generation' THEN 'Blog Writer v1'
        WHEN sg.name = 'Code Assistant' THEN 'Programming Helper v1'
        WHEN sg.name = 'Data Analysis' THEN 'Data Analyst v1'
    END as name,
    CASE 
        WHEN sg.name = 'Customer Support Bot' THEN 'You are a helpful and friendly customer support agent. Always be polite, professional, and empathetic. Listen carefully to customer concerns and provide clear, actionable solutions.'
        WHEN sg.name = 'Content Generation' THEN 'You are a creative content writer specializing in engaging blog posts. Write content that captures the reader''s attention from the first sentence and provides valuable insights throughout.'
        WHEN sg.name = 'Code Assistant' THEN 'You are an expert programming assistant. Help users write clean, efficient, and well-documented code. Explain complex concepts clearly and provide practical examples.'
        WHEN sg.name = 'Data Analysis' THEN 'You are a skilled data analyst. Help users understand their data through clear visualizations and actionable insights. Focus on practical recommendations based on the analysis.'
    END as content,
    'current' as status,
    CASE 
        WHEN sg.name = 'Customer Support Bot' THEN 'Initial version focusing on empathy and professionalism'
        WHEN sg.name = 'Content Generation' THEN 'Base version for engaging blog content'
        WHEN sg.name = 'Code Assistant' THEN 'Foundation version for programming help'
        WHEN sg.name = 'Data Analysis' THEN 'Starting version for data insights'
    END as description,
    0.85 as performance_score
FROM sample_groups sg
ON CONFLICT DO NOTHING;

-- Add some draft versions
WITH sample_groups AS (
    SELECT id, name FROM prompt_groups 
    WHERE name IN ('Customer Support Bot', 'Content Generation')
)
INSERT INTO prompt_versions (group_id, name, content, status, description)
SELECT 
    sg.id,
    CASE 
        WHEN sg.name = 'Customer Support Bot' THEN 'Enhanced Support Agent v2'
        WHEN sg.name = 'Content Generation' THEN 'SEO-Optimized Writer v2'
    END as name,
    CASE 
        WHEN sg.name = 'Customer Support Bot' THEN 'You are a highly skilled customer support agent with expertise in problem-solving. Be empathetic, professional, and solution-oriented. Use active listening techniques and always confirm understanding before providing solutions. Escalate complex issues appropriately.'
        WHEN sg.name = 'Content Generation' THEN 'You are an expert content writer specializing in SEO-optimized blog posts. Create engaging content that ranks well in search engines while providing genuine value to readers. Include relevant keywords naturally and structure content for both readers and search engines.'
    END as content,
    'draft' as status,
    CASE 
        WHEN sg.name = 'Customer Support Bot' THEN 'Enhanced version with better problem-solving focus'
        WHEN sg.name = 'Content Generation' THEN 'Version optimized for SEO performance'
    END as description
FROM sample_groups sg
ON CONFLICT DO NOTHING;

-- ================================================================
-- 8. USEFUL FUNCTIONS FOR APPLICATION
-- ================================================================

-- Function to get the latest version number for a group
CREATE OR REPLACE FUNCTION get_next_version_number(group_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE((
        SELECT MAX(version_number) + 1 
        FROM prompt_versions 
        WHERE group_id = group_uuid
    ), 1);
END;
$$ LANGUAGE plpgsql;

-- Function to promote a version to current/production
CREATE OR REPLACE FUNCTION promote_version(version_uuid UUID, new_status VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
    group_uuid UUID;
BEGIN
    -- Get the group ID
    SELECT group_id INTO group_uuid FROM prompt_versions WHERE id = version_uuid;
    
    IF group_uuid IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Update all versions of the same status to draft
    UPDATE prompt_versions 
    SET status = 'draft', updated_at = NOW()
    WHERE group_id = group_uuid AND status = new_status AND id != version_uuid;
    
    -- Promote the target version
    UPDATE prompt_versions 
    SET status = new_status, updated_at = NOW()
    WHERE id = version_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- 9. VERIFICATION QUERIES
-- ================================================================

-- Run these queries to verify the setup worked correctly:

-- Check tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('prompt_groups', 'prompt_versions');

-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('prompt_groups', 'prompt_versions')
ORDER BY tablename, indexname;

-- Check sample data was inserted
SELECT 
    pg.name as group_name,
    COUNT(pv.id) as version_count,
    COUNT(CASE WHEN pv.status = 'current' THEN 1 END) as current_versions,
    COUNT(CASE WHEN pv.status = 'draft' THEN 1 END) as draft_versions
FROM prompt_groups pg
LEFT JOIN prompt_versions pv ON pg.id = pv.group_id
GROUP BY pg.id, pg.name
ORDER BY pg.name;

-- ================================================================
-- SETUP COMPLETE!
-- ================================================================
-- 
-- Your prompt version control system is now ready to use.
-- 
-- Key features:
-- ✅ Hierarchical prompt organization (groups → versions)
-- ✅ Version status management (draft/current/production)
-- ✅ Automatic version numbering
-- ✅ Performance tracking
-- ✅ User-based security
-- ✅ Full audit trail with timestamps
-- ✅ Optimized indexes for fast queries
-- ✅ Sample data for testing
-- 
-- Next steps:
-- 1. Update your application to use the new Supabase storage context
-- 2. Test creating and managing prompt versions
-- 3. Verify the integration works correctly
-- 
-- ================================================================