-- Supabase Database Schema for Prompt Version Control
-- Run these SQL commands in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create prompt_groups table
CREATE TABLE IF NOT EXISTS prompt_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create prompt_versions table
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES prompt_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('draft', 'current', 'production')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_prompt_groups_user_id ON prompt_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_groups_created_at ON prompt_groups(created_at);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_group_id ON prompt_versions(group_id);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_status ON prompt_versions(status);
CREATE INDEX IF NOT EXISTS idx_prompt_versions_created_at ON prompt_versions(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_prompt_groups_updated_at 
    BEFORE UPDATE ON prompt_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_versions_updated_at 
    BEFORE UPDATE ON prompt_versions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE prompt_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_versions ENABLE ROW LEVEL SECURITY;

-- Policy for prompt_groups
CREATE POLICY "Users can view their own prompt groups" ON prompt_groups
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own prompt groups" ON prompt_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own prompt groups" ON prompt_groups
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own prompt groups" ON prompt_groups
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for prompt_versions (through group ownership)
CREATE POLICY "Users can view versions of their groups" ON prompt_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (prompt_groups.user_id = auth.uid() OR prompt_groups.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert versions to their groups" ON prompt_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (prompt_groups.user_id = auth.uid() OR prompt_groups.user_id IS NULL)
        )
    );

CREATE POLICY "Users can update versions of their groups" ON prompt_versions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (prompt_groups.user_id = auth.uid() OR prompt_groups.user_id IS NULL)
        )
    );

CREATE POLICY "Users can delete versions of their groups" ON prompt_versions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM prompt_groups 
            WHERE prompt_groups.id = prompt_versions.group_id 
            AND (prompt_groups.user_id = auth.uid() OR prompt_groups.user_id IS NULL)
        )
    );

-- Insert some sample data (optional)
-- You can remove this section if you don't want sample data
INSERT INTO prompt_groups (name, description, user_id) VALUES 
    ('Customer Support Bot', 'Prompts for customer support chatbot', NULL),
    ('Content Generation', 'Prompts for generating marketing content', NULL)
ON CONFLICT DO NOTHING;

-- Get the group IDs for sample versions
WITH groups AS (
    SELECT id, name FROM prompt_groups WHERE name IN ('Customer Support Bot', 'Content Generation')
)
INSERT INTO prompt_versions (group_id, name, content, status)
SELECT 
    g.id,
    CASE 
        WHEN g.name = 'Customer Support Bot' THEN 'Support Agent v1'
        WHEN g.name = 'Content Generation' THEN 'Blog Writer v1'
    END as name,
    CASE 
        WHEN g.name = 'Customer Support Bot' THEN 'You are a helpful customer support agent. Always be polite and professional.'
        WHEN g.name = 'Content Generation' THEN 'You are a creative content writer. Write engaging blog posts that capture the reader''s attention.'
    END as content,
    'current' as status
FROM groups g
ON CONFLICT DO NOTHING;