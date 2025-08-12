-- Migration script to convert game column from text to JSONB in user_roles table
-- This script handles the transition from storing single game as text to multiple games as JSONB array

-- Step 1: Add a new JSONB column
ALTER TABLE user_roles ADD COLUMN game_jsonb JSONB;

-- Step 2: Migrate existing data from text to JSONB
-- Convert existing text values to JSONB arrays
UPDATE user_roles 
SET game_jsonb = CASE 
    WHEN game IS NOT NULL AND game != '' THEN jsonb_build_array(game)
    ELSE NULL
END
WHERE game IS NOT NULL;

-- Step 3: Drop the old text column
ALTER TABLE user_roles DROP COLUMN game;

-- Step 4: Rename the new column to the original name
ALTER TABLE user_roles RENAME COLUMN game_jsonb TO game;

-- Step 5: Add an index for better performance on JSONB queries
CREATE INDEX idx_user_roles_game ON user_roles USING GIN (game);

-- Step 6: Add a constraint to ensure game column contains arrays
ALTER TABLE user_roles ADD CONSTRAINT check_game_is_array 
CHECK (game IS NULL OR jsonb_typeof(game) = 'array');

-- Optional: Add a comment to document the change
COMMENT ON COLUMN user_roles.game IS 'JSONB array of games the user is a host for. Example: ["valorant", "csgo"]';

-- Verify the migration
SELECT 
    user_id,
    user_email,
    user_role,
    game,
    jsonb_typeof(game) as game_type
FROM user_roles 
WHERE game IS NOT NULL
LIMIT 10;
