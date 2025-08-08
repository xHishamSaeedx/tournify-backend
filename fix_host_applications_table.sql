-- Fix host_applications table - Add missing RLS policies and permissions
-- Run this in your Supabase SQL Editor

-- Enable RLS on host_applications table
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own host applications" ON host_applications;
DROP POLICY IF EXISTS "Users can insert own host applications" ON host_applications;
DROP POLICY IF EXISTS "Users can update own host applications" ON host_applications;

-- Create RLS Policies for host_applications
CREATE POLICY "Users can view own host applications" ON host_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own host applications" ON host_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own host applications" ON host_applications
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON host_applications TO authenticated;

-- Verify the setup
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'host_applications';

-- Test insert (this should work for authenticated users)
-- INSERT INTO host_applications (user_id, user_email, experience, motivation) 
-- VALUES ('test-user-id', 'test@example.com', 'Test experience', 'Test motivation');
