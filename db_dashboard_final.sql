-- ==============================================================================
-- Sales Architect 2.0 - Final Dashboard Data Schema Update
-- ==============================================================================
-- Run this script in your Supabase SQL Editor to enable real data storage
-- for the new Coach Performance Dashboard.
-- ==============================================================================

-- Update session_metrics table with Conversation Quality metrics
ALTER TABLE session_metrics 
ADD COLUMN IF NOT EXISTS talk_to_listen_ratio float,
ADD COLUMN IF NOT EXISTS question_to_statement_ratio float,
ADD COLUMN IF NOT EXISTS discovery_time_ms integer,
ADD COLUMN IF NOT EXISTS pitch_time_ms integer,
ADD COLUMN IF NOT EXISTS filler_words_per_minute float,
ADD COLUMN IF NOT EXISTS speaking_pace_wpm integer,
ADD COLUMN IF NOT EXISTS framework_adherence_score integer,
ADD COLUMN IF NOT EXISTS product_knowledge_score integer; -- Added for Product Knowledge accuracy

-- Create table for Skill Breakdown
CREATE TABLE IF NOT EXISTS session_skills (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    skill_name text NOT NULL, -- e.g., 'Opening', 'Discovery'
    score integer NOT NULL, -- 0-100
    trend text, -- 'up', 'down', 'flat'
    description text,
    created_at timestamptz DEFAULT now()
);

-- Create table for Objection Handling
CREATE TABLE IF NOT EXISTS session_objections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    objection_type text NOT NULL,
    success boolean DEFAULT false,
    response_time_ms integer,
    created_at timestamptz DEFAULT now()
);

-- Create table for Sentiment Timeline
CREATE TABLE IF NOT EXISTS session_sentiment (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    timestamp_ms integer NOT NULL, -- Offset from start of call
    sentiment_score integer NOT NULL, -- 0-100
    trigger_event text, -- What caused the change
    created_at timestamptz DEFAULT now()
);

-- Create table for Product Keywords
CREATE TABLE IF NOT EXISTS session_keywords (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    keyword text NOT NULL,
    is_missed boolean DEFAULT false, -- true if it was a missed keyword
    created_at timestamptz DEFAULT now()
);

-- Create table for Detailed Coaching Feedback (for the Feed)
CREATE TABLE IF NOT EXISTS session_feedback_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    tag text, -- 'Strategy', 'Closing', etc.
    feedback_text text NOT NULL,
    impact_score text, -- e.g., '+5% Win Rate'
    transcript_ref text,
    created_at timestamptz DEFAULT now()
);

-- [NEW] Create table for Next Best Actions
CREATE TABLE IF NOT EXISTS session_next_actions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    action_type text NOT NULL, -- 'drill', 'learning', 'review'
    action_url text,
    is_completed boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Update profiles table for Activity Tracking
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS practice_streak_days integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_practice_date timestamptz;

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Ensure users can only access their own data via the session relationship
-- ==============================================================================

-- Enable RLS on new tables
ALTER TABLE session_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_next_actions ENABLE ROW LEVEL SECURITY;

-- Helper function to simplify RLS policies (optional, but cleaner)
-- For now, we'll stick to direct EXISTS clauses for compatibility.

-- Policy for session_skills
CREATE POLICY "Users can view their own session skills"
ON session_skills FOR SELECT
USING (
    exists (
        select 1 from sessions
        where sessions.id = session_skills.session_id
        and sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own session skills"
ON session_skills FOR INSERT
WITH CHECK (
    exists (
        select 1 from sessions
        where sessions.id = session_skills.session_id
        and sessions.user_id = auth.uid()
    )
);

-- Policy for session_objections
CREATE POLICY "Users can view their own session objections"
ON session_objections FOR SELECT
USING (
    exists (
        select 1 from sessions
        where sessions.id = session_objections.session_id
        and sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own session objections"
ON session_objections FOR INSERT
WITH CHECK (
    exists (
        select 1 from sessions
        where sessions.id = session_objections.session_id
        and sessions.user_id = auth.uid()
    )
);

-- Policy for session_sentiment
CREATE POLICY "Users can view their own session sentiment"
ON session_sentiment FOR SELECT
USING (
    exists (
        select 1 from sessions
        where sessions.id = session_sentiment.session_id
        and sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own session sentiment"
ON session_sentiment FOR INSERT
WITH CHECK (
    exists (
        select 1 from sessions
        where sessions.id = session_sentiment.session_id
        and sessions.user_id = auth.uid()
    )
);

-- Policy for session_keywords
CREATE POLICY "Users can view their own session keywords"
ON session_keywords FOR SELECT
USING (
    exists (
        select 1 from sessions
        where sessions.id = session_keywords.session_id
        and sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own session keywords"
ON session_keywords FOR INSERT
WITH CHECK (
    exists (
        select 1 from sessions
        where sessions.id = session_keywords.session_id
        and sessions.user_id = auth.uid()
    )
);

-- Policy for session_feedback_items
CREATE POLICY "Users can view their own session feedback items"
ON session_feedback_items FOR SELECT
USING (
    exists (
        select 1 from sessions
        where sessions.id = session_feedback_items.session_id
        and sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own session feedback items"
ON session_feedback_items FOR INSERT
WITH CHECK (
    exists (
        select 1 from sessions
        where sessions.id = session_feedback_items.session_id
        and sessions.user_id = auth.uid()
    )
);

-- Policy for session_next_actions
CREATE POLICY "Users can view their own session next actions"
ON session_next_actions FOR SELECT
USING (
    exists (
        select 1 from sessions
        where sessions.id = session_next_actions.session_id
        and sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own session next actions"
ON session_next_actions FOR INSERT
WITH CHECK (
    exists (
        select 1 from sessions
        where sessions.id = session_next_actions.session_id
        and sessions.user_id = auth.uid()
    )
);
