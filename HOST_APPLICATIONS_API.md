# Host Applications API

This document describes the host applications feature that allows users to apply to become tournament hosts.

## Database Schema

### Table: `host_applications`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier |
| `user_id` | UUID | NOT NULL, REFERENCES auth.users(id) | User who submitted the application |
| `user_email` | TEXT | NOT NULL | User's email address |
| `youtube_channel` | TEXT | NULL | Optional YouTube channel URL |
| `experience` | TEXT | NOT NULL | User's hosting experience |
| `motivation` | TEXT | NOT NULL | User's motivation for hosting |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Application submission timestamp |

## API Endpoints

### POST `/api/apply-host`

Submit a new host application.

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "youtube_channel": "https://youtube.com/@channelname",
  "experience": "I have been hosting Valorant tournaments for 2 years...",
  "motivation": "I want to help grow the Valorant community..."
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Host application submitted successfully",
  "data": {
    "id": "uuid",
    "user_email": "user@example.com",
    "youtube_channel": "https://youtube.com/@channelname",
    "experience": "I have been hosting Valorant tournaments for 2 years...",
    "motivation": "I want to help grow the Valorant community...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Validation Error - 400):**
```json
{
  "success": false,
  "error": "Experience and motivation are required fields",
  "message": "Please provide your experience and motivation for hosting tournaments"
}
```

**Response (Duplicate Application - 409):**
```json
{
  "success": false,
  "error": "Application already exists",
  "message": "You have already submitted a host application. Please wait for review.",
  "applicationId": "uuid",
  "submittedAt": "2024-01-01T00:00:00Z"
}
```

### GET `/api/host-applications/my`

Get all host applications submitted by the authenticated user.

**Authentication:** Required (Bearer token)

**Response (Success - 200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_email": "user@example.com",
      "youtube_channel": "https://youtube.com/@channelname",
      "experience": "I have been hosting Valorant tournaments for 2 years...",
      "motivation": "I want to help grow the Valorant community...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1
}
```

### GET `/api/host-applications/:id`

Get a specific host application by ID (only accessible by the application owner).

**Authentication:** Required (Bearer token)

**Parameters:**
- `id` (UUID): Application ID

**Response (Success - 200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "user_email": "user@example.com",
    "youtube_channel": "https://youtube.com/@channelname",
    "experience": "I have been hosting Valorant tournaments for 2 years...",
    "motivation": "I want to help grow the Valorant community...",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Response (Not Found - 404):**
```json
{
  "success": false,
  "error": "Application not found",
  "message": "The requested application does not exist or you don't have access to it"
}
```

## Security Features

### Row Level Security (RLS)

The `host_applications` table has RLS enabled with the following policies:

1. **Users can view own host applications** - Users can only see their own applications
2. **Users can insert own host applications** - Users can only create applications for themselves
3. **Users can update own host applications** - Users can only update their own applications

### Validation

- `experience` and `motivation` fields are required
- `youtube_channel` is optional
- Users can only submit one application (duplicate prevention)
- User ID and email are automatically extracted from the authentication token

## Setup Instructions

1. **Create the database table:**
   ```sql
   -- Run the SQL from create_host_applications_table.sql in your Supabase SQL editor
   ```

2. **Start the backend server:**
   ```bash
   cd tournify-backend
   npm install
   npm start
   ```

3. **Test the API:**
   ```bash
   # Update test-host-applications.js with a valid token
   node test-host-applications.js
   ```

## Frontend Integration

To integrate with the frontend, you'll need to:

1. Create a form component for host applications
2. Add API calls to submit applications
3. Add a dashboard to view submitted applications
4. Handle authentication and error states

Example frontend API call:
```javascript
const submitHostApplication = async (applicationData) => {
  const response = await fetch('/api/apply-host', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify(applicationData)
  });
  
  return response.json();
};
```

## Error Handling

The API includes comprehensive error handling for:
- Missing required fields
- Duplicate applications
- Authentication failures
- Database errors
- Invalid application IDs

All errors return consistent JSON responses with appropriate HTTP status codes.
