-- =====================================================
-- TOURNIFY SUPABASE RLS POLICIES SETUP
-- =====================================================
-- This script enables Row Level Security (RLS) and sets up
-- appropriate policies for all tables and storage buckets
-- =====================================================

-- Enable RLS on all tables (MANUALLY ENABLED - COMMENTED OUT)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE valorant_users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE valorant_deathmatch_rooms ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE valorant_deathmatch_participants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE host_applications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = player_id::uuid);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = player_id::uuid);

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = player_id::uuid);

-- Admins can read all users (using service role key)
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can delete users
CREATE POLICY "Admins can delete users" ON users
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- VALORANT_USERS TABLE POLICIES
-- =====================================================

-- Users can read their own Valorant profile
CREATE POLICY "Users can view own valorant profile" ON valorant_users
    FOR SELECT USING (auth.uid() = player_id::uuid);

-- Users can update their own Valorant profile
CREATE POLICY "Users can update own valorant profile" ON valorant_users
    FOR UPDATE USING (auth.uid() = player_id::uuid);

-- Users can insert their own Valorant profile
CREATE POLICY "Users can insert own valorant profile" ON valorant_users
    FOR INSERT WITH CHECK (auth.uid() = player_id::uuid);

-- Admins can read all Valorant users
CREATE POLICY "Admins can view all valorant users" ON valorant_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- VALORANT_DEATHMATCH_ROOMS TABLE POLICIES
-- =====================================================

-- Anyone can read public tournament rooms
CREATE POLICY "Anyone can view public tournaments" ON valorant_deathmatch_rooms
    FOR SELECT USING (true);

-- Hosts can create their own tournaments
CREATE POLICY "Hosts can create tournaments" ON valorant_deathmatch_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id::uuid);

-- Hosts can update their own tournaments
CREATE POLICY "Hosts can update own tournaments" ON valorant_deathmatch_rooms
    FOR UPDATE USING (auth.uid() = host_id::uuid);

-- Hosts can delete their own tournaments
CREATE POLICY "Hosts can delete own tournaments" ON valorant_deathmatch_rooms
    FOR DELETE USING (auth.uid() = host_id::uuid);

-- Admins can manage all tournaments
CREATE POLICY "Admins can manage all tournaments" ON valorant_deathmatch_rooms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- VALORANT_DEATHMATCH_PARTICIPANTS TABLE POLICIES
-- =====================================================

-- Users can view participants of tournaments they're in
CREATE POLICY "Users can view tournament participants" ON valorant_deathmatch_participants
    FOR SELECT USING (
        player_id::uuid = auth.uid() OR
        EXISTS (
            SELECT 1 FROM valorant_deathmatch_rooms 
            WHERE tournament_id = room_id 
            AND host_id::uuid = auth.uid()
        )
    );

-- Users can join tournaments
CREATE POLICY "Users can join tournaments" ON valorant_deathmatch_participants
    FOR INSERT WITH CHECK (auth.uid() = player_id::uuid);

-- Users can leave tournaments
CREATE POLICY "Users can leave tournaments" ON valorant_deathmatch_participants
    FOR DELETE USING (auth.uid() = player_id::uuid);

-- Hosts can update participant status in their tournaments
CREATE POLICY "Hosts can update participants" ON valorant_deathmatch_participants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM valorant_deathmatch_rooms 
            WHERE tournament_id = room_id 
            AND host_id::uuid = auth.uid()
        )
    );

-- Admins can manage all participants
CREATE POLICY "Admins can manage all participants" ON valorant_deathmatch_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- USER_ROLES TABLE POLICIES
-- =====================================================

-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id::uuid);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON user_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- HOST_APPLICATIONS TABLE POLICIES
-- =====================================================

-- Users can view their own applications
CREATE POLICY "Users can view own applications" ON host_applications
    FOR SELECT USING (auth.uid() = user_id::uuid);

-- Users can create applications
CREATE POLICY "Users can create applications" ON host_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id::uuid);

-- Users can update their own applications (if not approved/rejected)
CREATE POLICY "Users can update own applications" ON host_applications
    FOR UPDATE USING (
        auth.uid() = user_id::uuid AND 
        status IN ('pending', 'draft')
    );

-- Admins can view all applications
CREATE POLICY "Admins can view all applications" ON host_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all applications
CREATE POLICY "Admins can manage all applications" ON host_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- MATCHES TABLE POLICIES
-- =====================================================

-- Anyone can view public matches
CREATE POLICY "Anyone can view matches" ON matches
    FOR SELECT USING (true);

-- Users can create matches
CREATE POLICY "Users can create matches" ON matches
    FOR INSERT WITH CHECK (auth.uid() = created_by::uuid);

-- Users can update their own matches
CREATE POLICY "Users can update own matches" ON matches
    FOR UPDATE USING (auth.uid() = created_by::uuid);

-- Users can delete their own matches
CREATE POLICY "Users can delete own matches" ON matches
    FOR DELETE USING (auth.uid() = created_by::uuid);

-- Admins can manage all matches
CREATE POLICY "Admins can manage all matches" ON matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- USER_WALLETS TABLE POLICIES
-- =====================================================

-- Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON user_wallets
    FOR SELECT USING (auth.uid() = user_id::uuid);

-- Users can update their own wallet
CREATE POLICY "Users can update own wallet" ON user_wallets
    FOR UPDATE USING (auth.uid() = user_id::uuid);

-- System can create wallets for users
CREATE POLICY "System can create wallets" ON user_wallets
    FOR INSERT WITH CHECK (true);

-- Admins can view all wallets
CREATE POLICY "Admins can view all wallets" ON user_wallets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all wallets
CREATE POLICY "Admins can manage all wallets" ON user_wallets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- WALLET_TRANSACTIONS TABLE POLICIES
-- =====================================================

-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON wallet_transactions
    FOR SELECT USING (auth.uid() = user_id::uuid);

-- System can create transactions
CREATE POLICY "System can create transactions" ON wallet_transactions
    FOR INSERT WITH CHECK (true);

-- Admins can view all transactions
CREATE POLICY "Admins can view all transactions" ON wallet_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions" ON wallet_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Profile Pictures Storage Policies
-- Users can upload their own profile pictures
CREATE POLICY "Users can upload own profile pictures" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'profile-pictures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can view their own profile pictures
CREATE POLICY "Users can view own profile pictures" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'profile-pictures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own profile pictures
CREATE POLICY "Users can update own profile pictures" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'profile-pictures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own profile pictures
CREATE POLICY "Users can delete own profile pictures" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'profile-pictures' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Admins can manage all profile pictures
CREATE POLICY "Admins can manage all profile pictures" ON storage.objects
    FOR ALL USING (
        bucket_id = 'profile-pictures' AND
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id::uuid = auth.uid() 
            AND role = 'admin'
        )
    );

-- =====================================================
-- CREATE STORAGE BUCKET (if not exists)
-- =====================================================

-- Create profile-pictures bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = $1 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is host
CREATE OR REPLACE FUNCTION is_host(user_id text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = $1 
        AND role = 'host'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'valorant_users', 'valorant_deathmatch_rooms', 
    'valorant_deathmatch_participants', 'user_roles', 
    'host_applications', 'matches', 'user_wallets', 
    'wallet_transactions'
)
ORDER BY tablename;

-- Check storage buckets
SELECT * FROM storage.buckets;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname IN ('public', 'storage')
ORDER BY tablename, policyname;
