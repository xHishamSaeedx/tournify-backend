# Valorant Data Migration Guide

This guide outlines the migration of Valorant-related data from the `users` table to a new `valorant_users` table.

## Overview

The following columns are being moved from the `users` table to the new `valorant_users` table:

- `valo_name` → `valorant_name`
- `valo_tag` → `valorant_tag`
- `platform` → `platform`
- `region` → `region`

## Database Changes

### 1. New Table Structure

The `valorant_users` table has been created with the following structure:

```sql
CREATE TABLE valorant_users (
    user_id UUID PRIMARY KEY REFERENCES users(id),
    valorant_name VARCHAR NOT NULL,
    valorant_tag VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    region VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Migration Script

Run the migration script `migrate_valorant_data.sql` to move existing data:

```bash
# Execute the migration script in your Supabase SQL editor
# or run it via your database management tool
```

## Code Changes

### 1. New Route File

A new route file `src/routes/valorant_users.js` has been created to handle Valorant user operations:

- `GET /api/valorant-users` - Get all valorant users
- `GET /api/valorant-users/:userId` - Get valorant user by user ID
- `POST /api/valorant-users` - Create new valorant user
- `PUT /api/valorant-users/:userId` - Update valorant user
- `DELETE /api/valorant-users/:userId` - Delete valorant user

### 2. Updated Files

#### `src/routes/players.js`

- Modified POST route to insert user data and valorant data separately
- Modified PUT route to update both user and valorant data
- Uses upsert for valorant data to handle both insert and update cases

#### `src/routes/tournaments.js`

- Updated queries to join with `valorant_users` table
- Modified profile completeness checks to use new table structure
- Updated participant queries to include valorant data from new table

#### `server.js`

- Added new valorant_users route import and registration
- Updated user verification to fetch valorant data from new table
- Modified profile completeness logic

## Migration Steps

### Step 1: Run Database Migration

1. Execute the `migrate_valorant_data.sql` script in your Supabase SQL editor
2. Verify the migration was successful by checking the migration summary

### Step 2: Deploy Code Changes

1. Deploy the updated backend code with the new route and modified files
2. Test the new endpoints to ensure they work correctly

### Step 3: Update Frontend (if needed)

1. Update any frontend code that directly references the old column names
2. Update API calls to use the new valorant_users endpoints if needed

### Step 4: Clean Up (Optional)

1. After confirming everything works correctly, you can optionally remove the old columns from the users table:

```sql
ALTER TABLE users
DROP COLUMN valo_name,
DROP COLUMN valo_tag,
DROP COLUMN platform,
DROP COLUMN region;
```

## API Changes

### Before Migration

```javascript
// Old structure - all data in users table
{
  "id": "uuid",
  "username": "player1",
  "valo_name": "PlayerOne",
  "valo_tag": "1234",
  "platform": "PC",
  "region": "NA"
}
```

### After Migration

```javascript
// New structure - separated data
{
  "id": "uuid",
  "username": "player1",
  "valorant_data": {
    "valorant_name": "PlayerOne",
    "valorant_tag": "1234",
    "platform": "PC",
    "region": "NA"
  }
}
```

## Testing

### 1. Test New Endpoints

- Test all CRUD operations on `/api/valorant-users`
- Verify data integrity and relationships

### 2. Test Existing Functionality

- Test player registration and updates
- Test tournament joining and participant listing
- Test user verification and profile completeness checks

### 3. Verify Data Migration

- Check that all existing valorant data was properly migrated
- Verify no data loss occurred during migration

## Rollback Plan

If issues arise, you can rollback by:

1. Reverting the code changes
2. Restoring the old column structure if they were removed
3. Moving data back from `valorant_users` to `users` table

## Notes

- The migration preserves all existing data
- The new structure provides better separation of concerns
- The `valorant_users` table uses `user_id` as the primary key, referencing the `users` table
- All existing functionality should continue to work with the new structure
