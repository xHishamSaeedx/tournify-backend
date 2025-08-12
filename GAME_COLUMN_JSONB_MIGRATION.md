# Game Column Migration to JSONB

## Overview

The `game` column in the `user_roles` table has been migrated from `TEXT` to `JSONB` format to support multiple games per host. This allows users to be hosts for multiple games simultaneously.

## Database Changes

### Before Migration

- `game` column was `TEXT` type
- Could only store one game per host (e.g., "valorant")
- Limited flexibility for multi-game hosts

### After Migration

- `game` column is now `JSONB` type
- Can store multiple games as an array (e.g., `["valorant", "csgo", "lol"]`)
- Better performance with GIN indexing
- Type safety with array constraint

## Migration Steps

1. **Run the migration script**:

   ```sql
   -- Execute the migrate_game_column_to_jsonb.sql script
   ```

2. **Verify the migration**:
   ```sql
   SELECT user_id, user_email, user_role, game
   FROM user_roles
   WHERE game IS NOT NULL;
   ```

## API Changes

### Updated Endpoints

#### 1. Get User Roles (`GET /api/user-roles/:userId`)

**Before:**

```json
{
  "roles": ["host", "player"]
}
```

**After:**

```json
{
  "roles": [
    {
      "role": "host",
      "games": ["valorant", "csgo"]
    },
    {
      "role": "player",
      "games": []
    }
  ]
}
```

#### 2. Approve Host Application (`POST /api/admin/approve-application`)

**Request:**

```json
{
  "applicationId": "123",
  "game": "valorant"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Application approved successfully",
  "data": {
    "user_email": "user@example.com",
    "games": ["valorant"]
  }
}
```

### New Endpoints

#### 1. Add Game to Host (`POST /api/admin/add-game-to-host`)

```json
{
  "userId": "user-uuid",
  "game": "csgo"
}
```

#### 2. Remove Game from Host (`POST /api/admin/remove-game-from-host`)

```json
{
  "userId": "user-uuid",
  "game": "valorant"
}
```

#### 3. Get Host Games (`GET /api/admin/host-games/:userId`)

```json
{
  "success": true,
  "data": {
    "user_email": "user@example.com",
    "games": ["valorant", "csgo"]
  }
}
```

#### 4. Check Host for Specific Game (`GET /api/user-roles/:userId/host-for-game/:game`)

```json
{
  "isHost": true,
  "games": ["valorant", "csgo"],
  "requestedGame": "valorant"
}
```

## Usage Examples

### Adding a Host for Multiple Games

1. Approve initial application for "valorant"
2. Use `add-game-to-host` to add "csgo"
3. Use `add-game-to-host` to add "lol"

### Checking Host Status

```javascript
// Check if user is host for valorant
const response = await fetch(
  `/api/user-roles/${userId}/host-for-game/valorant`
);
const { isHost, games } = await response.json();

if (isHost) {
  console.log(`User is host for: ${games.join(", ")}`);
}
```

### Managing Host Games (Admin)

```javascript
// Add a new game to existing host
await fetch("/api/admin/add-game-to-host", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user-uuid",
    game: "csgo",
  }),
});

// Remove a game from host
await fetch("/api/admin/remove-game-from-host", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user-uuid",
    game: "valorant",
  }),
});
```

## Database Queries

### Find All Hosts for a Specific Game

```sql
SELECT user_id, user_email
FROM user_roles
WHERE user_role = 'host'
AND game @> '["valorant"]';
```

### Find Hosts for Multiple Games

```sql
SELECT user_id, user_email
FROM user_roles
WHERE user_role = 'host'
AND game @> '["valorant", "csgo"]';
```

### Count Games per Host

```sql
SELECT
  user_email,
  jsonb_array_length(game) as game_count,
  game
FROM user_roles
WHERE user_role = 'host';
```

## Benefits

1. **Scalability**: Support for unlimited games per host
2. **Performance**: GIN indexing for fast JSONB queries
3. **Flexibility**: Easy to add/remove games without schema changes
4. **Type Safety**: Database constraints ensure data integrity
5. **Query Power**: Rich JSONB operators for complex queries

## Backward Compatibility

The API maintains backward compatibility by:

- Returning empty arrays for non-host roles
- Handling null/missing game data gracefully
- Providing fallback values in responses

## Error Handling

The system handles various edge cases:

- Duplicate game additions (returns error)
- Removing non-existent games (returns error)
- Empty game arrays (removes host role entirely)
- Invalid JSONB data (database constraints prevent)
