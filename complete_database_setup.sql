-- Complete Database Setup for Tournify
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. USER ROLES TABLE SETUP
-- =====================================================

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

-- Create indexes for user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);

-- =====================================================
-- 2. PLAYERS TABLE RLS SETUP
-- =====================================================

-- Enable RLS on players table
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for players table
-- Users can only view their own player record
CREATE POLICY "Users can view own player data" ON players
    FOR SELECT
    USING (auth.uid() = player_id);

-- Users can insert their own player record
CREATE POLICY "Users can insert own player data" ON players
    FOR INSERT
    WITH CHECK (auth.uid() = player_id);

-- Users can update their own player record
CREATE POLICY "Users can update own player data" ON players
    FOR UPDATE
    USING (auth.uid() = player_id)
    WITH CHECK (auth.uid() = player_id);

-- Users can delete their own player record (optional)
CREATE POLICY "Users can delete own player data" ON players
    FOR DELETE
    USING (auth.uid() = player_id);

-- Service role policy for backend operations
CREATE POLICY "Service role has full access" ON players
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create indexes for players table
CREATE INDEX IF NOT EXISTS idx_players_player_id ON players(player_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_valo_id ON players(valo_id);

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to get user roles
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE (role_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT ur.role_name
    FROM user_roles ur
    WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role_name = role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_role(UUID, TEXT) TO authenticated;

-- =====================================================
-- 4. DEFAULT DATA (Optional)
-- =====================================================

-- You can add default roles here if needed
-- INSERT INTO user_roles (user_id, role_name) VALUES 
--     ('00000000-0000-0000-0000-000000000000', 'admin')
-- ON CONFLICT (user_id, role_name) DO NOTHING; 