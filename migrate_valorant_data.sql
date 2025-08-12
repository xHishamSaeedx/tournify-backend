-- Migration script to move Valorant-related data from users table to valorant_users table
-- This script should be run after the valorant_users table has been created

-- Step 1: Insert data from users table into valorant_users table
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
ON CONFLICT (user_id) DO UPDATE SET
    valorant_name = EXCLUDED.valorant_name,
    valorant_tag = EXCLUDED.valorant_tag,
    platform = EXCLUDED.platform,
    region = EXCLUDED.region;

-- Step 2: Verify the migration
SELECT 
    'Migration Summary' as info,
    COUNT(*) as total_users_with_valorant_data,
    COUNT(CASE WHEN valo_name != 'TBD' AND valo_tag != 'TBD' THEN 1 END) as users_with_complete_valorant_data
FROM users 
WHERE valo_name IS NOT NULL AND valo_tag IS NOT NULL;

SELECT 
    'Valorant Users Table' as info,
    COUNT(*) as total_valorant_users
FROM valorant_users;

-- Step 3: Show sample of migrated data
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
