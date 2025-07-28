# Tournify Backend

A Node.js backend server for the Tournify tournament management application, built with Express.js and Supabase.

## Features

- 🏆 Tournament management (CRUD operations)
- 👥 User management
- 🎮 Match management and scoring
- 🔐 Supabase integration for database
- 🛡️ Security middleware (Helmet, CORS, Rate limiting)
- 📊 Health check endpoint
- 🚀 Production-ready configuration

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account and project

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd tournify-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   # Copy the example environment file
   cp env.example .env

   # Edit .env with your Supabase credentials
   nano .env
   ```

4. **Supabase Setup**
   - Create a new Supabase project
   - Go to Settings > API to get your credentials
   - Update the `.env` file with your Supabase URL and keys

## Environment Variables

| Variable                    | Description               | Required | Default               |
| --------------------------- | ------------------------- | -------- | --------------------- |
| `PORT`                      | Server port               | No       | 3001                  |
| `NODE_ENV`                  | Environment               | No       | development           |
| `SUPABASE_URL`              | Supabase project URL      | Yes      | -                     |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key    | Yes      | -                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No       | -                     |
| `JWT_SECRET`                | JWT secret for auth       | No       | -                     |
| `CORS_ORIGIN`               | CORS origin               | No       | http://localhost:3000 |

## Database Schema

### Tables

#### tournaments

- `id` (uuid, primary key)
- `name` (text, required)
- `description` (text)
- `start_date` (timestamp)
- `end_date` (timestamp)
- `max_participants` (integer)
- `tournament_type` (text)
- `status` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### users

- `id` (uuid, primary key)
- `email` (text, required)
- `username` (text, required)
- `full_name` (text)
- `avatar_url` (text)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### matches

- `id` (uuid, primary key)
- `tournament_id` (uuid, foreign key)
- `player1_id` (uuid, foreign key)
- `player2_id` (uuid, foreign key)
- `match_number` (integer)
- `round_number` (integer)
- `match_type` (text)
- `status` (text)
- `winner_id` (uuid, foreign key)
- `player1_score` (integer)
- `player2_score` (integer)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## API Endpoints

### Health Check

- `GET /health` - Server health status

### Tournaments

- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament by ID
- `POST /api/tournaments` - Create new tournament
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Matches

- `GET /api/matches` - Get all matches
- `GET /api/matches/tournament/:tournamentId` - Get matches by tournament
- `GET /api/matches/:id` - Get match by ID
- `POST /api/matches` - Create new match
- `PUT /api/matches/:id` - Update match
- `PUT /api/matches/:id/result` - Update match result
- `DELETE /api/matches/:id` - Delete match

## Running the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

## Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with nodemon
- `npm test` - Run tests (to be implemented)

## Project Structure

```
tournify-backend/
├── config/
│   └── supabase.js          # Supabase configuration
├── routes/
│   ├── tournaments.js        # Tournament routes
│   ├── users.js             # User routes
│   └── matches.js           # Match routes
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
├── env.example              # Environment variables example
└── README.md               # This file
```

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Prevents abuse
- **Input Validation**: Request validation
- **Error Handling**: Comprehensive error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License.
