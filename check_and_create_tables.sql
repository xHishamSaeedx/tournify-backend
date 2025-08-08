-- Check and create all necessary tables
-- Run this in your Supabase SQL Editor

-- 1. Fix user_roles table
DO $$ 
BEGIN
    -- Check if the role_name column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_roles' 
        AND column_name = 'role_name'
    ) THEN
        -- Add the role_name column
        ALTER TABLE user_roles ADD COLUMN role_name TEXT;
        
        -- Update existing records with default role
        UPDATE user_roles SET role_name = 'player' WHERE role_name IS NULL;
        
        -- Make role_name NOT NULL after setting default values
        ALTER TABLE user_roles ALTER COLUMN role_name SET NOT NULL;
        
        RAISE NOTICE 'Added role_name column to user_roles table';
    ELSE
        RAISE NOTICE 'role_name column already exists in user_roles table';
    END IF;
END $$;

-- 2. Create host_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS host_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    youtube_channel TEXT,
    experience TEXT,
    motivation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for host_applications
CREATE INDEX IF NOT EXISTS idx_host_applications_user_id ON host_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_host_applications_created_at ON host_applications(created_at);

-- Enable RLS on host_applications
ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for host_applications
DO $$
BEGIN
    -- Users can only view their own applications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'host_applications' 
        AND policyname = 'Users can view own host applications'
    ) THEN
        CREATE POLICY "Users can view own host applications" ON host_applications
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    -- Users can only insert their own applications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'host_applications' 
        AND policyname = 'Users can insert own host applications'
    ) THEN
        CREATE POLICY "Users can insert own host applications" ON host_applications
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Users can only update their own applications
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'host_applications' 
        AND policyname = 'Users can update own host applications'
    ) THEN
        CREATE POLICY "Users can update own host applications" ON host_applications
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON host_applications TO authenticated;

-- 3. Verify all tables exist and have correct structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('user_roles', 'host_applications', 'players')
ORDER BY table_name, ordinal_position;

-- 4. Show table counts
SELECT 
    'user_roles' as table_name,
    COUNT(*) as record_count
FROM user_roles
UNION ALL
SELECT 
    'host_applications' as table_name,
    COUNT(*) as record_count
FROM host_applications
UNION ALL
SELECT 
    'players' as table_name,
    COUNT(*) as record_count
FROM players;
