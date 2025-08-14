# Tournament Processor Background Job

## Overview

The tournament processing functionality has been converted from a REST endpoint to a background job using `node-cron`. This change improves system reliability and ensures automatic processing of tournament results.

## Changes Made

### 1. Removed Endpoint

- **Removed:** `POST /api/valorant-users/tournament-participants`
- **File:** `src/routes/valorant_users.js`

### 2. Added Background Job Service

- **New File:** `src/services/tournamentProcessor.js`
- **Dependencies:** Added `node-cron` package

### 3. Updated Server Configuration

- **File:** `server.js`
- **Changes:** Added tournament processor initialization

## How It Works

### Background Job Schedule

- **Frequency:** Every minute (`* * * * *`)
- **Timezone:** UTC

### Processing Logic

1. **Query Pending Tournaments:**

   ```sql
   SELECT tournament_id, match_result_time
   FROM valorant_deathmatch_rooms
   WHERE match_result_time < NOW()
   AND processed = false
   ```

2. **For Each Tournament:**
   - Fetch participants from `valorant_deathmatch_participants`
   - Get Valorant user information
   - Retrieve tournament details (match_start_time, match_map)
   - Call Valorant Deathmatch Service for validation
   - If validation fails: Mark as processed with status "invalid"
   - If validation passes: Generate leaderboard, allocate prizes, mark as processed with status "valid"

### Database Requirements

The `valorant_deathmatch_rooms` table must have these columns:

```sql
ALTER TABLE valorant_deathmatch_rooms
ADD COLUMN processed BOOLEAN DEFAULT FALSE;

ALTER TABLE valorant_deathmatch_rooms
ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
```

## Environment Variables

Required environment variable:

```
VALORANT_DEATHMATCH_SERVICE_URL=<your-valorant-service-url>
```

## API Endpoints Called

The background job calls the same Valorant Deathmatch Service endpoints:

1. **Match Validation:**

   ```
   POST ${VALORANT_DEATHMATCH_SERVICE_URL}/matches/validate-match-history
   ```

2. **Leaderboard Generation:**
   ```
   POST ${VALORANT_DEATHMATCH_SERVICE_URL}/matches/leaderboard
   ```

## Prize Allocation

The system automatically allocates prizes to winners:

- **1st Place:** 50% of prize pool
- **2nd Place:** 30% of prize pool
- **3rd Place:** 20% of prize pool

Prizes are added to user wallets via the `increment_balance` RPC function.

## Error Handling

- Failed tournaments are marked as processed with status "invalid" to prevent infinite retries
- Comprehensive logging for debugging
- Graceful handling of Valorant service unavailability
- Status tracking: "pending" → "valid" or "invalid"

## Testing

Run the test script to verify functionality:

```bash
node test_tournament_processor.js
```

## Monitoring

The background job provides detailed console logging:

- 🕐 Checking for pending tournaments
- 🔄 Processing tournament: [tournament_id]
- 🔍 Validating match with valorant service
- 🏆 Getting leaderboard from valorant service
- 💰 Prize allocation completed
- ✅ Tournament processed successfully

## Benefits

1. **Automatic Processing:** No manual intervention required
2. **Reliability:** Handles failures gracefully
3. **Scalability:** Processes multiple tournaments efficiently
4. **Monitoring:** Comprehensive logging for debugging
5. **Resource Efficiency:** Only processes tournaments that need attention
