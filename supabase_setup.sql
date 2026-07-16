-- ============================================
-- R&D Publication Tracker — Supabase SQL Setup (RBAC & Funding)
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create the publications table
CREATE TABLE IF NOT EXISTS publications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    roll_no TEXT NOT NULL,
    name TEXT NOT NULL,
    program TEXT NOT NULL CHECK (program IN ('UG', 'PG')),
    branch TEXT NOT NULL,
    article_title TEXT NOT NULL,
    publication_type TEXT NOT NULL CHECK (publication_type IN ('Journal', 'Conference')),
    indexing TEXT,
    journal_conference_title TEXT,
    sponsorship TEXT,
    paper_link TEXT,
    mentor_name TEXT,
    funding_amount NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create public_publications view (excludes funding_amount for public users)
CREATE OR REPLACE VIEW public_publications AS
SELECT 
    id, 
    roll_no, 
    name, 
    program, 
    branch, 
    article_title, 
    publication_type, 
    indexing, 
    journal_conference_title, 
    sponsorship, 
    mentor_name, 
    paper_link, 
    created_at, 
    updated_at
FROM publications;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Policies for publications
-- SELECT: Authenticated users can read all publications (including funding)
DROP POLICY IF EXISTS "Allow select for authenticated users" ON publications;
CREATE POLICY "Allow select for authenticated users"
    ON publications FOR SELECT TO authenticated USING (true);

-- INSERT: Authenticated users (admins/super_admins) can insert
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON publications;
CREATE POLICY "Allow insert for authenticated users"
    ON publications FOR INSERT TO authenticated WITH CHECK (true);

-- UPDATE: Authenticated users can update
DROP POLICY IF EXISTS "Allow update for authenticated users" ON publications;
CREATE POLICY "Allow update for authenticated users"
    ON publications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE: Authenticated users can delete
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON publications;
CREATE POLICY "Allow delete for authenticated users"
    ON publications FOR DELETE TO authenticated USING (true);

-- 6. Policies for user_roles
-- Users can select their own role
DROP POLICY IF EXISTS "Allow users to read own role" ON user_roles;
CREATE POLICY "Allow users to read own role"
    ON user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_publications_name ON publications(name);
CREATE INDEX IF NOT EXISTS idx_publications_roll_no ON publications(roll_no);
CREATE INDEX IF NOT EXISTS idx_publications_program ON publications(program);
CREATE INDEX IF NOT EXISTS idx_publications_branch ON publications(branch);
CREATE INDEX IF NOT EXISTS idx_publications_type ON publications(publication_type);
CREATE INDEX IF NOT EXISTS idx_publications_created ON publications(created_at DESC);
