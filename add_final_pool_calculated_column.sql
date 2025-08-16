-- Migration: Add final_pool_calculated column to valorant_deathmatch_rooms table
-- This column tracks whether the final prize pool has been calculated based on actual player count

-- Add the final_pool_calculated column with default value false
ALTER TABLE valorant_deathmatch_rooms 
ADD COLUMN final_pool_calculated BOOLEAN DEFAULT FALSE;

-- Add a comment to explain the column's purpose
COMMENT ON COLUMN valorant_deathmatch_rooms.final_pool_calculated IS 
'Indicates whether the final prize pool has been calculated based on actual player count 5 minutes before match start';

-- Update existing tournaments to have final_pool_calculated = true if they have already started
UPDATE valorant_deathmatch_rooms 
SET final_pool_calculated = TRUE 
WHERE match_start_time < NOW();

-- Create an index on final_pool_calculated and match_start_time for efficient querying
CREATE INDEX idx_final_pool_calculated_match_start 
ON valorant_deathmatch_rooms(final_pool_calculated, match_start_time);

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'valorant_deathmatch_rooms' 
AND column_name = 'final_pool_calculated';
