-- Setup Row Level Security for players table
-- Run this in your Supabase SQL Editor

-- Enable RLS on players table
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for players table
-- Users can only view their own player record
CREATE POLICY "Users can view own player data" ON players
    FOR SELECT
    USING (auth.uid() = player_id);

-- Users can insert their own player record
CREATE POLICY "Users can insert own player data" ON players
    FOR INSERT
    WITH CHECK (auth.uid() = player_id);

-- Users can update their own player record
CREATE POLICY "Users can update own player data" ON players
    FOR UPDATE
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- Users can delete their own player record (optional)
CREATE POLICY "Users can delete own player data" ON players
    FOR DELETE
    USING (auth.uid() = player_id);

-- Service role policy for backend operations
CREATE POLICY "Service role has full access" ON players
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_valo_id ON players(valo_id); 