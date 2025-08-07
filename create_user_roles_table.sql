-- Create user_roles table for role management
-- Run this in your Supabase SQL Editor

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    role_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_roles_unique_user_role UNIQUE (user_id, role_name)
);

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all roles
CREATE POLICY "Service role has full access" ON user_roles
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);

-- Insert default roles
INSERT INTO user_roles (user_id, role_name) VALUES 
    ('00000000-0000-0000-0000-000000000000', 'player') -- Default role for new users
ON CONFLICT (user_id, role_name) DO NOTHING; 