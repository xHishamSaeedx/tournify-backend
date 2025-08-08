-- Create admin user in user_roles table
-- STEP 1: Find your user ID first by running this query:
-- SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- STEP 2: Replace the values below with your actual user data
-- Replace 'your-user-id' with the ID from step 1
-- Replace 'your-email@example.com' with your actual email

INSERT INTO user_roles (user_id, user_email, user_role, created_at)
VALUES (
    'your-user-id',  -- Replace with your actual user ID from step 1
    'your-email@example.com',  -- Replace with your actual email
    'admin',
    NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET 
    user_role = 'admin',
    user_email = EXCLUDED.user_email,
    created_at = NOW();

-- STEP 3: Verify the admin was created
SELECT * FROM user_roles WHERE user_role = 'admin';
