-- ============================================
-- R&D Publication Tracker — Supabase SQL Setup
-- ============================================
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- This creates the publications table and enables Row Level Security

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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy that allows all operations for anonymous users
-- (Since this is a department tool without auth, we allow public access)
-- You can restrict this later if you add authentication

-- Allow SELECT (read) for everyone
CREATE POLICY "Allow public read access"
    ON publications
    FOR SELECT
    TO anon
    USING (true);

-- Allow INSERT (create) for everyone
CREATE POLICY "Allow public insert access"
    ON publications
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow UPDATE for everyone
CREATE POLICY "Allow public update access"
    ON publications
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Allow DELETE for everyone
CREATE POLICY "Allow public delete access"
    ON publications
    FOR DELETE
    TO anon
    USING (true);

-- 4. Create an index for faster searches
CREATE INDEX idx_publications_name ON publications(name);
CREATE INDEX idx_publications_roll_no ON publications(roll_no);
CREATE INDEX idx_publications_program ON publications(program);
CREATE INDEX idx_publications_branch ON publications(branch);
CREATE INDEX idx_publications_type ON publications(publication_type);
CREATE INDEX idx_publications_created ON publications(created_at DESC);

-- 5. (Optional) Insert sample data to test
-- Uncomment the lines below if you want to pre-populate with test data

-- INSERT INTO publications (roll_no, name, program, branch, article_title, publication_type, indexing, journal_conference_title, sponsorship) VALUES
-- ('21CSE001', 'Aarav Sharma', 'UG', 'CSE', 'Deep Learning Approaches for NLP in Healthcare', 'Journal', 'Scopus', 'International Journal of AI in Medicine', 'AICTE Funded'),
-- ('21ECE045', 'Priya Reddy', 'UG', 'ECE', 'IoT-Based Smart Agriculture Monitoring using LoRaWAN', 'Conference', 'IEEE', 'IEEE International Conference on IoT', NULL),
-- ('22MCA012', 'Rohan Patel', 'PG', 'MCA', 'Blockchain-Based Decentralized Identity Management', 'Journal', 'SCI', 'Journal of Distributed Systems & Technology', 'UGC Fellowship');

-- Done! Your table is ready.
-- Now go to Settings > API in your Supabase dashboard to get your URL and anon key.
