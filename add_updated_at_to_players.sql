-- Add updated_at column to players table
-- Run this in your Supabase SQL Editor if you want automatic timestamp updates

-- Add updated_at column
ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create trigger function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_players_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_players_updated_at_trigger ON players;
CREATE TRIGGER update_players_updated_at_trigger 
    BEFORE UPDATE ON players 
    FOR EACH ROW 
    EXECUTE FUNCTION update_players_updated_at();

-- Update existing rows to have updated_at set to created_at
UPDATE players SET updated_at = created_at WHERE updated_at IS NULL; 