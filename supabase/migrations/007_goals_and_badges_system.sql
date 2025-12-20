-- Goals and Badges System Migration
-- Creates tables for system goals, badges, and user progress tracking

-- System Goals Table
CREATE TABLE IF NOT EXISTS system_goals (
  id INTEGER PRIMARY KEY,
  phase INTEGER NOT NULL CHECK (phase BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  completion_criteria JSONB NOT NULL,
  badge_name TEXT NOT NULL,
  difficulty_rank INTEGER NOT NULL,
  is_system_goal BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  badge_id SERIAL PRIMARY KEY,
  badge_name TEXT NOT NULL UNIQUE,
  badge_description TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  goal_id INTEGER REFERENCES system_goals(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Goal Progress Table
CREATE TABLE IF NOT EXISTS user_goal_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id INTEGER NOT NULL REFERENCES system_goals(id),
  progress_value NUMERIC DEFAULT 0,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, goal_id)
);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(badge_id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_goal_progress_user_id ON user_goal_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goal_progress_goal_id ON user_goal_progress(goal_id);
CREATE INDEX IF NOT EXISTS idx_user_goal_progress_completed ON user_goal_progress(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_system_goals_phase ON system_goals(phase);

-- Enable RLS
ALTER TABLE system_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_goals - all users can read
CREATE POLICY "System goals are viewable by everyone" ON system_goals
  FOR SELECT USING (true);

-- RLS Policies for badges - all users can read
CREATE POLICY "Badges are viewable by everyone" ON badges
  FOR SELECT USING (true);

-- RLS Policies for user_goal_progress - users can only see their own progress
CREATE POLICY "Users can view their own goal progress" ON user_goal_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own goal progress" ON user_goal_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert goal progress" ON user_goal_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_badges - users can only see their own badges
CREATE POLICY "Users can view their own badges" ON user_badges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert user badges" ON user_badges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

