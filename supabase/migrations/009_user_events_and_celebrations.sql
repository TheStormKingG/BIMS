-- User Events and Celebrations System Migration
-- Adds event tracking and celebration queue for goal completions

-- User Events Table (append-only log)
CREATE TABLE IF NOT EXISTS user_events (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_events
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_occurred_at ON user_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_user_events_user_event_type ON user_events(user_id, event_type);

-- Update user_goal_progress to include status and progress_json
ALTER TABLE user_goal_progress
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('LOCKED', 'ACTIVE', 'COMPLETED')),
ADD COLUMN IF NOT EXISTS progress_json JSONB DEFAULT '{}'::jsonb;

-- Update existing completed goals to have status 'COMPLETED'
UPDATE user_goal_progress
SET status = 'COMPLETED'
WHERE is_completed = true;

-- User Celebrations Table (queue for UI to show confetti + popup)
CREATE TABLE IF NOT EXISTS user_celebrations (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id INTEGER NOT NULL REFERENCES system_goals(id),
  badge_id INTEGER NOT NULL REFERENCES badges(badge_id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  shown_at TIMESTAMPTZ,
  UNIQUE(user_id, goal_id)
);

-- Indexes for user_celebrations
CREATE INDEX IF NOT EXISTS idx_user_celebrations_user_id ON user_celebrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_celebrations_shown_at ON user_celebrations(shown_at);
CREATE INDEX IF NOT EXISTS idx_user_celebrations_pending ON user_celebrations(user_id, shown_at) WHERE shown_at IS NULL;

-- Enable RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_celebrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_events - users can only see their own events
CREATE POLICY "Users can view their own events" ON user_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user events" ON user_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_celebrations - users can only see their own celebrations
CREATE POLICY "Users can view their own celebrations" ON user_celebrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user celebrations" ON user_celebrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own celebrations" ON user_celebrations
  FOR UPDATE USING (auth.uid() = user_id);

