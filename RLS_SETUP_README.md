# Tournify Supabase RLS (Row Level Security) Setup Guide

This guide will help you enable Row Level Security (RLS) and set up appropriate security policies for your Tournify application's Supabase database and storage.

## 🎯 What is RLS?

Row Level Security (RLS) is a security feature that controls access to rows in database tables based on the characteristics of the user executing a query. It ensures that users can only access data they're authorized to see.

## 📋 Prerequisites

1. **Supabase Project**: You should have a Supabase project set up
2. **Database Tables**: All required tables should be created
3. **Supabase Dashboard Access**: You need access to the Supabase SQL Editor

## 🚀 Step-by-Step Implementation

### Step 1: Access Supabase SQL Editor

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Tournify project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run the RLS Setup Script

1. Copy the entire contents of `supabase_rls_policies.sql`
2. Paste it into the SQL Editor
3. Click **Run** to execute the script

### Step 3: Verify RLS Implementation

After running the script, you can verify that RLS is properly set up by running these verification queries:

```sql
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
```

## 🔐 Security Policies Overview

### Table-Level Policies

#### 1. **Users Table**

- Users can only view, update, and insert their own profile
- Admins can view, update, and delete all users

#### 2. **Valorant Users Table**

- Users can only manage their own Valorant profile
- Admins can view all Valorant users

#### 3. **Tournament Rooms (valorant_deathmatch_rooms)**

- Anyone can view public tournaments
- Hosts can create, update, and delete their own tournaments
- Admins can manage all tournaments

#### 4. **Tournament Participants (valorant_deathmatch_participants)**

- Users can view participants of tournaments they're in
- Users can join and leave tournaments
- Hosts can update participant status in their tournaments
- Admins can manage all participants

#### 5. **User Roles**

- Users can view their own roles
- Admins can view and manage all roles

#### 6. **Host Applications**

- Users can view and manage their own applications
- Users can only update applications that are pending or draft
- Admins can view and manage all applications

#### 7. **Matches**

- Anyone can view public matches
- Users can create, update, and delete their own matches
- Admins can manage all matches

#### 8. **Wallets & Transactions**

- Users can only view their own wallet and transactions
- System can create wallets and transactions
- Admins can view and manage all wallets and transactions

### Storage-Level Policies

#### Profile Pictures Storage

- Users can only upload, view, update, and delete their own profile pictures
- Admins can manage all profile pictures
- Files are organized by user ID in the folder structure

## 🔧 Important Notes

### 1. **Service Role Key Usage**

Your backend uses the `supabaseAdmin` client with the service role key, which bypasses RLS. This is correct for server-side operations, but ensure your frontend uses the regular client with RLS enabled.

### 2. **Authentication Context**

RLS policies use `auth.uid()` to identify the current user. Make sure your frontend is properly authenticated with Supabase Auth.

### 3. **File Naming Convention**

For profile pictures, the storage policy expects files to be named with the user ID as the first part of the path: `{user_id}-{timestamp}.{extension}`

### 4. **Admin Role Setup**

Make sure you have at least one admin user in the `user_roles` table:

```sql
-- Create an admin user (replace with actual user ID)
INSERT INTO user_roles (user_id, role, created_at)
VALUES ('your-user-id', 'admin', NOW());
```

## 🧪 Testing RLS Policies

### Test User Access

1. Create a test user account
2. Try to access data that doesn't belong to them
3. Verify they can only access their own data

### Test Admin Access

1. Create an admin user
2. Verify they can access all data
3. Test admin-specific operations

### Test Storage Access

1. Try to upload a profile picture
2. Verify the file is stored in the correct location
3. Test accessing other users' profile pictures (should be denied)

## 🚨 Troubleshooting

### Common Issues

1. **"Policy does not exist" errors**

   - Make sure you ran the complete SQL script
   - Check for any syntax errors in the SQL

2. **"Permission denied" errors**

   - Verify the user is authenticated
   - Check if the user has the required role
   - Ensure the policy conditions are correct

3. **Storage upload failures**
   - Verify the storage bucket exists
   - Check the file naming convention
   - Ensure the user is authenticated

### Debug Queries

```sql
-- Check current user's roles
SELECT * FROM user_roles WHERE user_id = auth.uid()::text;

-- Check if user exists
SELECT * FROM users WHERE player_id = auth.uid()::text;

-- Test storage policies
SELECT * FROM storage.objects WHERE bucket_id = 'profile-pictures';
```

## 🔄 Updating Policies

If you need to modify policies later:

1. **Drop existing policies**:

```sql
DROP POLICY "Policy Name" ON table_name;
```

2. **Create new policies**:

```sql
CREATE POLICY "New Policy Name" ON table_name
    FOR operation USING (condition);
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

## ✅ Checklist

- [ ] RLS enabled on all tables
- [ ] Storage policies configured
- [ ] Admin user created
- [ ] Policies tested with different user roles
- [ ] Storage bucket created and configured
- [ ] Frontend authentication working
- [ ] Backend service role key configured

## 🎉 Success!

Once you've completed all steps, your Tournify application will have comprehensive security policies that ensure:

- Users can only access their own data
- Admins have full access to manage the system
- Storage is properly secured
- Tournament hosts can manage their events
- All operations are properly authenticated and authorized

Your application is now ready for production with robust security measures in place!
