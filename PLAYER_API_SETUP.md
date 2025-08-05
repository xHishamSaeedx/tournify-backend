# Player API Setup

This document describes the changes made to move player form data handling from direct frontend Supabase calls to backend API calls.

## Changes Made

### Backend Changes

1. **Created `/routes/players.js`**
   - Added CRUD operations for player data
   - GET `/api/players` - Get all players
   - GET `/api/players/:id` - Get player by ID
   - POST `/api/players` - Create new player
   - PUT `/api/players/:id` - Update existing player
   - DELETE `/api/players/:id` - Delete player

2. **Updated `server.js`**
   - Added players route import
   - Added `/api/players` route to the server
   - Added players endpoint to the root endpoint documentation

3. **Added Supabase import**
   - Imported supabase client for database operations

### Frontend Changes

1. **Updated `src/utils/api.js`**
   - Added player API functions:
     - `getPlayers()`
     - `getPlayer(id)`
     - `createPlayer(data)`
     - `updatePlayer(id, data)`
     - `deletePlayer(id)`

2. **Updated `src/components/PlayerForm.jsx`**
   - Replaced direct Supabase calls with backend API calls
   - Updated import from `supabase` to `api`
   - Modified player data fetching logic
   - Updated form submission logic to use backend API

## API Endpoints

### Player Endpoints

- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Request/Response Format

#### Create Player (POST /api/players)
```json
{
  "player_id": "user-uuid",
  "display_name": "Player Name",
  "username": "username",
  "DOB": "1990-01-01",
  "valo_id": "Username#Tag",
  "VPA": "VPA123"
}
```

#### Update Player (PUT /api/players/:id)
```json
{
  "display_name": "Updated Name",
  "username": "updated_username",
  "DOB": "1990-01-01",
  "valo_id": "Username#Tag",
  "VPA": "VPA123"
}
```

#### Response Format
```json
{
  "success": true,
  "data": {
    "player_id": "user-uuid",
    "display_name": "Player Name",
    "username": "username",
    "DOB": "1990-01-01",
    "valo_id": "Username#Tag",
    "VPA": "VPA123",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
  "message": "Player created successfully"
}
```

## Environment Variables

Make sure your `.env` file includes:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
CORS_ORIGIN=http://localhost:5176
```

## Testing

Run the test script to verify the backend is working:

```bash
cd tournify-backend
node test-backend.js
```

## Benefits of This Change

1. **Security**: Player data is now validated and processed on the backend
2. **Consistency**: All API calls go through the same authentication middleware
3. **Scalability**: Backend can handle additional business logic and validation
4. **Maintainability**: Centralized data access layer
5. **Error Handling**: Better error handling and logging on the backend

## Frontend Usage

The frontend now uses the `api` utility instead of direct Supabase calls:

```javascript
// Old way (direct Supabase)
const { data, error } = await supabase
  .from('players')
  .insert(playerData)
  .select()
  .single();

// New way (backend API)
const response = await api.createPlayer(playerData);
if (response.success) {
  // Handle success
}
``` 