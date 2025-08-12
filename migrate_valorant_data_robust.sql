-- Robust migration script to move Valorant-related data from users table to valorant_users table
-- This script includes better error handling and validation

-- Step 1: Verify the valorant_users table structure
DO $$
BEGIN
    -- Check if valorant_users table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'valorant_users') THEN
        RAISE EXCEPTION 'valorant_users table does not exist. Please create it first.';
    END IF;
    
    -- Check if user_id column exists and is not nullable
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'valorant_users' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        RAISE EXCEPTION 'user_id column in valorant_users table must exist and be NOT NULL.';
    END IF;
    
    RAISE NOTICE 'Table structure validation passed.';
END $$;

-- Step 2: Insert data from users table into valorant_users table
-- Only insert records where all required fields are present and valid
-- user_id should reference auth.users.id, which is stored as player_id in users table
INSERT INTO valorant_users (user_id, valorant_name, valorant_tag, platform, region)
SELECT 
    player_id as user_id,  -- Use player_id (auth.users.id) as user_id
    valo_name as valorant_name,
    valo_tag as valorant_tag,
    platform,
    region
FROM users 
WHERE player_id IS NOT NULL
    AND valo_name IS NOT NULL 
    AND valo_tag IS NOT NULL 
    AND platform IS NOT NULL 
    AND region IS NOT NULL
    AND valo_name != 'TBD'
    AND valo_tag != 'TBD'
    AND valo_name != ''
    AND valo_tag != ''
    AND platform != ''
    AND region != ''
ON CONFLICT (user_id) DO UPDATE SET
    valorant_name = EXCLUDED.valorant_name,
    valorant_tag = EXCLUDED.valorant_tag,
    platform = EXCLUDED.platform,
    region = EXCLUDED.region;

-- Step 3: Verify the migration
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_users_with_valorant_data,
    COUNT(CASE WHEN valo_name != 'TBD' AND valo_tag != 'TBD' THEN 1 END) as users_with_complete_valorant_data
FROM users 
WHERE valo_name IS NOT NULL AND valo_tag IS NOT NULL;

SELECT 
    'Valorant Users Table' as info,
    COUNT(*) as total_valorant_users,
    COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
    COUNT(CASE WHEN user_id IS NULL THEN 1 END) as records_with_null_user_id
FROM valorant_users;

-- Step 4: Show sample of migrated data
SELECT 
    u.id as user_id,
    u.username,
    u.valo_name as old_valorant_name,
    vu.valorant_name as new_valorant_name,
    u.valo_tag as old_valorant_tag,
    vu.valorant_tag as new_valorant_tag,
    u.platform as old_platform,
    vu.platform as new_platform,
    u.region as old_region,
    vu.region as new_region
FROM users u
LEFT JOIN valorant_users vu ON u.id = vu.user_id
WHERE u.valo_name IS NOT NULL AND u.valo_tag IS NOT NULL
LIMIT 10;

-- Step 5: Verify foreign key relationships
SELECT 
    'Foreign Key Check' as info,
    COUNT(*) as total_valorant_users,
    COUNT(CASE WHEN u.id IS NOT NULL THEN 1 END) as valid_foreign_keys,
    COUNT(CASE WHEN u.id IS NULL THEN 1 END) as orphaned_records
FROM valorant_users vu
LEFT JOIN users u ON vu.user_id = u.id;
