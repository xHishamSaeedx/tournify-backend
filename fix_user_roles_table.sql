-- Fix user_roles table - Add missing role_name column
-- Run this in your Supabase SQL Editor

-- Check if role_name column exists, if not add it
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
        
        -- Add unique constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'user_roles_unique_user_role'
        ) THEN
            ALTER TABLE user_roles ADD CONSTRAINT user_roles_unique_user_role 
            UNIQUE (user_id, role_name);
        END IF;
        
        RAISE NOTICE 'Added role_name column to user_roles table';
    ELSE
        RAISE NOTICE 'role_name column already exists in user_roles table';
    END IF;
END $$;

-- Create index for role_name if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);

-- Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_roles' 
ORDER BY ordinal_position;
