# Final Prize Pool Calculation Feature

## Overview

This feature automatically calculates the final prize pool for tournaments 5 minutes before their scheduled start time, based on the actual number of players who have joined the tournament.

## Background

Previously, the prize pool was calculated at tournament creation time based on the maximum capacity. This new feature ensures that the final prize pool reflects the actual participation, providing more accurate and fair prize distributions.

## How It Works

### Cron Job Schedule

- **Frequency**: Runs every minute
- **Trigger**: Checks for tournaments that are 5 minutes or less away from their `match_start_time`
- **Condition**: Only processes tournaments where `final_pool_calculated` is `false`

### Prize Pool Formula

The final prize pool is calculated using the following formula:

```
Final Prize Pool = (current_players × joining_fee) × (0.7 + (0.15 - host_percentage)) + (0.9 × host_contribution)
```

Where:

- `current_players`: Actual number of players who joined the tournament (calculated dynamically from `valorant_deathmatch_participants` table)
- `joining_fee`: Entry fee per player
- `host_percentage`: Host's percentage cut (stored as decimal, e.g., 0.15 for 15%)
- `host_contribution`: Additional contribution from the host

### Database Changes

#### New Column

- `final_pool_calculated` (BOOLEAN, DEFAULT FALSE)
  - Tracks whether the final prize pool has been calculated
  - Prevents duplicate calculations
  - Set to `true` after calculation is complete

#### Index

- Created index on `(final_pool_calculated, match_start_time)` for efficient querying

## Implementation Details

### Files Created/Modified

1. **`src/services/prizePoolCalculator.js`** (NEW)

   - Contains the cron job logic
   - Handles prize pool calculation
   - Updates database with final values

2. **`server.js`** (MODIFIED)

   - Imports and initializes the new service
   - Starts the cron job when server starts

3. **`add_final_pool_calculated_column.sql`** (NEW)
   - Database migration script
   - Adds the required column and index

### Key Functions

#### `processFinalPrizePoolCalculation()`

- Main function that runs every minute
- Queries for eligible tournaments
- Processes each tournament individually

#### `calculateFinalPrizePool(tournament)`

- Calculates the final prize pool for a specific tournament
- Updates the database with new values
- Sets `final_pool_calculated` to `true`

## Usage

### Running the Migration

```sql
-- Execute the migration script
\i add_final_pool_calculated_column.sql
```

### Starting the Service

The cron job automatically starts when the server starts. No additional configuration is required.

### Monitoring

The service logs detailed information about:

- Tournaments being processed
- Calculation details (current players, fees, percentages)
- Success/failure of updates
- Final prize pool amounts

## Example Log Output

```
🕐 Checking for tournaments that need final prize pool calculation...
📋 Found 2 tournaments that need final prize pool calculation
🎯 Processing tournament: Valorant Tournament #123 (ID: abc-123)
   - Match start time: 2024-01-15T10:00:00Z
   - Time until start: 3 minutes
💰 Calculating final prize pool for tournament abc-123:
   - Current players: 8
   - Joining fee: 10
   - Host percentage: 15%
   - Host contribution: 50
   - Final prize pool: 156
✅ Successfully updated final prize pool for tournament abc-123: 156
```

## Benefits

1. **Fair Prize Distribution**: Prize pools reflect actual participation
2. **Transparency**: Players know the exact prize pool before the tournament starts
3. **Automation**: No manual intervention required
4. **Accuracy**: Based on real-time player count
5. **Efficiency**: Only calculates once per tournament

## Error Handling

- Database errors are logged but don't stop the cron job
- Individual tournament failures don't affect other tournaments
- Failed calculations can be retried manually if needed
- All errors are logged with detailed information

## Future Enhancements

- Add notification system to inform players of final prize pool
- Implement retry mechanism for failed calculations
- Add admin dashboard to monitor calculation status
- Consider adding minimum prize pool guarantees
