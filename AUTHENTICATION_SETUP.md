# Tournify Authentication & Role Management Setup

This document explains the complete authentication flow and role management system for Tournify.

## 🗄️ Database Tables

### 1. `players` Table
- Stores player profile information
- Automatically created when user logs in
- Contains: `player_id`, `display_name`, `username`, `DOB`, `valo_id`, `VPA`

### 2. `user_roles` Table
- Manages user roles and permissions
- Automatically assigns 'player' role on first login
- Contains: `id`, `user_id`, `role_name`, `created_at`, `updated_at`

## 🔐 Authentication Flow

### When User Logs In:
1. **Token Verification**: Backend verifies Supabase auth token
2. **Player Record Check**: Checks if player record exists in `players` table
3. **Auto-Create Player**: If no record exists, creates basic player record with:
   - `player_id`: User's auth ID
   - `display_name`: From user metadata or email
   - `username`: From user metadata or email
   - `DOB`: Default '2000-01-01' (user must update)
   - `valo_id`: 'TBD' (user must update)
   - `VPA`: 'TBD' (user must update)
4. **Role Assignment**: Assigns 'player' role in `user_roles` table
5. **Response**: Returns user info + player status

## 📋 API Endpoints

### Authentication
- `POST /auth/verify` - Verify token and setup player/roles

### User Roles Management
- `GET /api/user-roles/:userId` - Get user's roles
- `POST /api/user-roles/:userId/roles` - Assign role to user
- `DELETE /api/user-roles/:userId/roles/:roleName` - Remove role from user

## 🛠️ Setup Instructions

### Step 1: Database Setup
Run the complete database setup script in Supabase SQL Editor:
```sql
-- Copy and paste the contents of complete_database_setup.sql
```

### Step 2: Test Authentication
1. Start your backend server
2. Login through your frontend
3. Check server logs for successful player creation and role assignment

### Step 3: Verify Setup
- Check `players` table for new player records
- Check `user_roles` table for assigned roles
- Test role management endpoints

## 🔍 Response Format

### Successful Login Response:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "avatar_url": "https://...",
    "verified_at": "2024-01-01T00:00:00.000Z"
  },
  "player": {
    "player_id": "user-uuid",
    "display_name": "User Name",
    "username": "username",
    "profile_complete": false,
    "profile_created": true,
    "needs_setup": true
  }
}
```

## 🎯 Role Management

### Available Roles:
- `player` - Default role for all users
- `admin` - Administrative access (can be added manually)
- `moderator` - Tournament moderation (can be added manually)

### Adding Roles:
```bash
# Assign admin role to user
curl -X POST http://localhost:3001/api/user-roles/USER_ID/roles \
  -H "Content-Type: application/json" \
  -d '{"role_name": "admin"}'
```

### Checking Roles:
```bash
# Get user's roles
curl http://localhost:3001/api/user-roles/USER_ID
```

## 🔒 Security Features

### Row Level Security (RLS):
- Users can only access their own player data
- Users can only view their own roles
- Service role has full access for backend operations

### Helper Functions:
- `get_user_roles(user_uuid)` - Get all roles for a user
- `has_role(user_uuid, role)` - Check if user has specific role

## 🚨 Troubleshooting

### Common Issues:

1. **"relation does not exist" errors**:
   - Run the complete database setup script
   - Check if tables were created successfully

2. **RLS policy violations**:
   - Ensure user is authenticated
   - Check if policies are applied correctly

3. **Role assignment failures**:
   - Verify user_roles table exists
   - Check service role permissions

### Debug Steps:
1. Check server logs for detailed error messages
2. Verify database tables exist in Supabase dashboard
3. Test RLS policies in Supabase SQL Editor
4. Ensure service role has proper permissions

## 📝 Next Steps

1. **Frontend Integration**: Update frontend to handle the new response format
2. **Profile Completion**: Create forms for users to complete their profiles
3. **Role-Based UI**: Implement role-based access control in the frontend
4. **Admin Panel**: Create admin interface for role management
5. **Tournament Integration**: Use roles for tournament permissions

## 🔄 Migration Notes

If you have existing data:
1. Run the database setup script (it uses `IF NOT EXISTS`)
2. Existing players will need to be assigned roles manually
3. Consider creating a migration script for existing users 