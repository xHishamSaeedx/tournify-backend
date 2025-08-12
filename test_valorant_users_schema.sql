-- Test script to verify valorant_users table structure
-- Run this in your Supabase SQL editor to check the table structure

-- Check if the table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'valorant_users' 
ORDER BY ordinal_position;

-- Check if the user_id column has a foreign key constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'valorant_users';

-- Check if there are any existing records in valorant_users
SELECT COUNT(*) as total_records FROM valorant_users;

-- Check if there are any records with null user_id
SELECT COUNT(*) as null_user_id_records FROM valorant_users WHERE user_id IS NULL;
