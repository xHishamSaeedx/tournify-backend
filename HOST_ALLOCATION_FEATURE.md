# Host Allocation Feature

## Overview

During match validation and prize allocation, the tournament processor now automatically allocates credits to tournament hosts based on their configured host percentage.

## How It Works

### Formula

The host's credit allocation is calculated using the following formula:

```
host_share = (joining_fee * capacity) * host_percentage
```

Where:

- `joining_fee`: The fee each player pays to join the tournament
- `capacity`: The maximum number of players allowed in the tournament
- `host_percentage`: The percentage of total joining fees allocated to the host (stored as decimal, e.g., 0.15 for 15%)

### Process Flow

1. **Match Validation**: The system validates the match using the VALORANT_DEATHMATCH_SERVICE_URL
2. **Prize Allocation**: If validation passes, prizes are allocated to winners (1st, 2nd, 3rd place)
3. **Host Allocation**: After prize allocation, credits are automatically allocated to the tournament host

### Database Changes

The `allocatePrizesToWinners` function now queries additional fields from the `valorant_deathmatch_rooms` table:

- `host_id`: The user ID of the tournament host
- `joining_fee`: The joining fee for the tournament
- `capacity`: The tournament capacity
- `host_percentage`: The host's percentage share

### Transaction Types

The system creates a new transaction type for host allocations:

- **Type**: `tournament_host_fee`
- **Description**: `Host fee for {tournament_name}`
- **Amount**: Calculated host share
- **Reference**: Tournament ID

### Return Data

The `allocatePrizesToWinners` function now returns additional information:

```javascript
{
  tournament_id: string,
  prize_pool: number,
  winners: array,
  total_allocated: number,
  host_allocation: {
    host_id: string,
    host_share: number,
    new_balance: number,
    transaction_id: string
  },
  message: string
}
```

## Error Handling

- If any required fields are missing (`host_id`, `joining_fee`, `capacity`, `host_percentage`), host allocation is skipped
- If the calculated host share is 0, no allocation is made
- If the host's wallet doesn't exist, a new wallet is created
- All errors are logged but don't prevent the tournament from being marked as processed

## Logging

The system provides comprehensive logging for host allocation:

- `👑 Allocating credits to tournament host...`
- `💰 Host allocation: joining_fee=X, capacity=Y, host_percentage=Z, host_share=W`
- `✅ Allocated X credits to host (host_id) for tournament_name`
- `ℹ️ No host allocation needed (host_share = 0)`
- `ℹ️ Skipping host allocation - missing required data`

## Testing

Run the host allocation test to verify the calculation:

```bash
node test_host_allocation.js
```

## Example

For a tournament with:

- Joining fee: 100 credits
- Capacity: 10 players
- Host percentage: 15% (0.15)

The host allocation would be:

```
host_share = (100 * 10) * 0.15 = 1000 * 0.15 = 150 credits
```

## Integration

This feature is automatically integrated into the existing tournament processing workflow and requires no additional configuration beyond the existing tournament setup.
