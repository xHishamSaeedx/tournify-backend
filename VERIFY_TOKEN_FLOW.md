# Token Flow Verification Guide

This guide helps you verify that the Supabase access token is being correctly passed from the frontend to the backend.

## What We've Added

### Backend Logging
- **Authorization Header Logging**: All player endpoints now log when they receive authorization headers
- **Token Extraction**: The backend extracts and logs the token (first 20 characters for security)
- **Request Data Logging**: Player data being sent is logged
- **Database Operation Logging**: All Supabase operations are logged with success/error status

### Frontend Logging
- **Token Availability**: Logs when tokens are available or missing
- **API Call Logging**: Logs all API calls being made to the backend
- **Response Logging**: Logs response status and data

## How to Test

### 1. Start the Backend Server
```bash
cd tournify-backend
npm run dev
```

### 2. Start the Frontend
```bash
cd tournify-frontend
npm run dev
```

### 3. Test Token Flow
1. **Open browser console** (F12) to see frontend logs
2. **Open terminal** to see backend logs
3. **Login to the application** with a Supabase account
4. **Navigate to the player form** and try to submit it
5. **Check both console and terminal** for the logs

## Expected Logs

### Frontend Console (Browser)
```
🔐 Token available: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
🚀 Making API call to: http://localhost:3001/api/players
📋 Headers being sent: {Content-Type: "application/json", Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
📡 Response status: 201
✅ API call successful: {success: true, data: {...}, message: "Player created successfully"}
```

### Backend Terminal
```
🔐 Authorization header received: Present
📋 Full headers: {authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", ...}
🎫 Token extracted: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
📝 Player data received: {player_id: "...", display_name: "...", ...}
🔍 Checking if player already exists for ID: ...
✅ No existing player found, proceeding with creation
💾 Attempting to insert player into database...
✅ Player successfully inserted: {...}
```

## Troubleshooting

### If Token is Missing
**Frontend logs:**
```
❌ No authentication token available
Error getting auth headers: No authentication token available
```

**Solutions:**
1. Make sure user is logged in to Supabase
2. Check if Supabase session is valid
3. Verify Supabase client configuration

### If Backend Rejects Request
**Backend logs:**
```
🔐 Authorization header received: Missing
```

**Solutions:**
1. Check if frontend is sending the Authorization header
2. Verify CORS configuration
3. Check if the API call is using the authenticatedApiCall function

### If Database Operation Fails
**Backend logs:**
```
❌ Error inserting player into database: {error details}
```

**Solutions:**
1. Check Supabase connection
2. Verify database permissions
3. Check if the players table exists
4. Verify RLS policies

## Test Scripts

### Run Token Test
```bash
cd tournify-backend
node test-token.js
```

### Run Backend Test
```bash
cd tournify-backend
node test-backend.js
```

## Key Points to Verify

1. **Token Extraction**: The backend should receive and extract the Bearer token
2. **Token Format**: Token should start with "Bearer " followed by the JWT
3. **Database Access**: The token should allow Supabase operations
4. **Error Handling**: Missing tokens should return 401 errors
5. **Success Flow**: Valid tokens should allow successful database operations

## Security Notes

- Tokens are logged with only the first 20 characters for debugging
- Full tokens are never logged to prevent security issues
- Authorization headers are validated on all protected endpoints
- Database operations use the Supabase client with proper authentication 