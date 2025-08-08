-- Verify user_roles table structure
-- Run this in your Supabase SQL Editor

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;

-- Check if host_applications table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'host_applications'
ORDER BY ordinal_position;

-- Show current user_roles data
SELECT 
    user_id,
    user_email,
    user_role,
    created_at
FROM user_roles
ORDER BY created_at DESC
LIMIT 10;

-- Show host_applications data (if table exists)
SELECT 
    id,
    user_id,
    user_email,
    experience,
    created_at
FROM host_applications
ORDER BY created_at DESC
LIMIT 10;
