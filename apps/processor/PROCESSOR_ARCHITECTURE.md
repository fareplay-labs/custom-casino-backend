# Solana Processor Architecture

## Overview

The Solana processor follows the same event-driven architecture as the Arbitrum FarePlay backend, adapted for Solana's transaction structure. It uses a multi-stage pipeline to process blockchain events:

1. **Transaction Listening** - Listens to Solana program transactions
2. **Transaction Parsing** - Extracts typed events from raw transactions
3. **Event Storage** - Creates event records in the database
4. **Event Interpretation** - Creates abstraction records (Pool, Trial, etc.)

## Architecture Components

### 1. Program Listener (`program-listener.ts`)

- **Purpose**: Listens to Solana transactions for the Fare Vault program
- **Methods**:
  - Real-time listening via WebSocket (`onLogs`)
  - Backfill of historical transactions on startup
- **Output**: Raw Solana transactions

### 2. Transaction Parser (`parsers/transaction-parser.ts`)

- **Purpose**: Parses Solana transactions into typed blockchain events
- **Process**:
  1. Uses `FareVaultParser` to decode transaction instructions
  2. Maps instructions to one or more events
  3. Extracts event data with proper typing

**Supported Instructions → Events Mapping:**

| Instruction | Events Emitted |
|-------------|----------------|
| `pool_register` | PoolRegistered |
| `pool_manager_update` | PoolManagerUpdated |
| `qk_config_register` | QkWithConfigRegistered |
| `trial_register` | TrialRegistered, FeeCharged (FeePlay) |
| `trial_resolve` | TrialResolved, PoolAccumulatedAmount(Updated/Released), FeeCharged (FeeLoss/FeeMint) |

### 3. Blockchain Event Handler (`handlers/blockchain-event-handler.ts`)

- **Purpose**: Creates event records in the database
- **Process**:
  1. Calculates `orderIndex` (slot * 1e12 + instructionIndex * 1e6 + innerInstructionIndex)
  2. Creates event record in corresponding table (e.g., `TrialRegisteredEvent`)
  3. Queues event for interpretation

**Event Tables Created:**
- `PoolRegisteredEvent`
- `PoolManagerUpdatedEvent`
- `PoolAccumulatedAmountUpdatedEvent`
- `PoolAccumulatedAmountReleasedEvent`
- `QkWithConfigRegisteredEvent`
- `FeeChargedEvent`
- `TrialRegisteredEvent`
- `TrialResolvedEvent`

### 4. Event Interpretation Handler (`handlers/event-interpretation-handler.ts`)

- **Purpose**: Creates abstraction records that link events together
- **Process**: For each event type, creates the necessary abstraction records

**Interpretation Logic:**

#### PoolRegistered
- Creates `User` (if doesn't exist)
- Creates `PoolRegistered` abstraction
- Creates `Pool`

#### TrialRegistered
- Validates `Pool`, `User`, `QkWithConfigRegistered`, `GameConfig` exist
- Creates `TrialRegistered` abstraction
- Creates `Trial`
- Creates `GameInstance`

#### TrialResolved
- Validates `Trial` exists
- Creates `TrialResolved` abstraction
- Updates `Trial` with result
- Updates `GameInstance` with result

#### FeeCharged
- Validates `Pool` and `Trial` exist
- Creates `FeeCharged` abstraction
- Creates `Fee` with calculated amounts (host, pool)

## Data Flow

```
Solana Transaction
    ↓
ProgramListener detects transaction
    ↓
parseTransaction() extracts events
    ↓
Queue: blockchain-event (BullMQ)
    ↓
BlockchainEventHandler creates event records
    ↓
Queue: event-interpretation (BullMQ)
    ↓
EventInterpretationHandler creates abstractions
    ↓
Database records ready for API queries
```

## Key Differences from Arbitrum Version

### Transaction Structure
- **Arbitrum**: Block-based, uses `blockNumber`, `txIndex`, `logIndex`
- **Solana**: Slot-based, uses `slot`, `instructionIndex`, `innerInstructionIndex`

### Event Emission
- **Arbitrum**: Smart contract emits explicit events via `emit`
- **Solana**: Events are inferred from instruction types and their effects

### Identifier Calculation
- **Arbitrum**: `orderIndex = blockNumber * 1e12 + txIndex * 1e6 + logIndex`
- **Solana**: `orderIndex = slot * 1e12 + instructionIndex * 1e6 + innerInstructionIndex`

### Transaction Finality
- **Arbitrum**: Single confirmation level
- **Solana**: Uses `confirmed` commitment level (balance between speed and finality)

## Database Schema Alignment

### Event Tables (Raw Events)
Each Solana instruction creates records in event tables:
- Primary key: `orderIndex` (BigInt)
- Contains raw event data
- Has unique constraint on `(slot, instructionIndex, innerInstructionIndex)`

### Abstraction Tables (Interpreted Events)
Link events together into meaningful entities:
- `Pool`, `PoolRegistered`, `PoolManagerUpdated`
- `Trial`, `TrialRegistered`, `TrialResolved`
- `Fee`, `FeeCharged`
- `QkWithConfigRegistered`

## Configuration

### Environment Variables
```bash
# Required
OWNER_WALLET=<your_solana_wallet>
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random_secret>

# Optional
BACKFILL_ENABLED=true
BACKFILL_LIMIT=1000
```

### Hardcoded Constants
- `FARE_VAULT_PROGRAM_ID`: Set in `packages/utils/src/config.ts`
- `SOLANA_NETWORK`: `mainnet-beta` (hardcoded)

## Queue System (BullMQ)

### Queues
1. **blockchain-event** - Raw event processing
   - Concurrency: 5
   - Rate limit: 10 jobs/second
   
2. **event-interpretation** - Event interpretation
   - Concurrency: 3
   
3. **stats-update** - Statistics aggregation
   - Debounced per casino (5 second delay)

## Error Handling

### Duplicate Detection
- Job IDs prevent duplicate processing
- Unique constraints on database prevent duplicate records

### Retry Logic
- Failed jobs automatically retry with exponential backoff
- Missing dependencies (e.g., Pool not found) cause job to retry

### Logging
- Structured logging with `pino`
- Separate loggers for each component
- Log levels: debug, info, warn, error

## Testing the Processor

### 1. Setup
```bash
# Ensure database is running
docker-compose up -d postgres redis

# Run migrations
cd packages/db && npx prisma migrate dev

# Install dependencies
npm install
```

### 2. Configuration
Create `.env` in project root:
```bash
OWNER_WALLET=YourSolanaWalletHere
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/custom_casino_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=development-secret
BACKFILL_ENABLED=true
BACKFILL_LIMIT=100
```

### 3. Start Processor
```bash
npm run dev:processor
```

### 4. Monitor Logs
The processor will log:
- WebSocket connection status
- Transactions detected
- Events parsed
- Database records created
- Any errors

### 5. Verify Database
```sql
-- Check event records
SELECT COUNT(*) FROM "TrialRegisteredEvent";
SELECT COUNT(*) FROM "TrialResolvedEvent";

-- Check abstraction records
SELECT COUNT(*) FROM "Trial";
SELECT * FROM "Trial" LIMIT 5;

-- Check user records
SELECT COUNT(*) FROM "User";
```

## Monitoring & Debugging

### BullMQ Dashboard
Access at `http://localhost:3000/admin/queues` (if configured)

### Redis Inspection
```bash
redis-cli
> KEYS blockchain-event*
> KEYS event-interpretation*
```

### Database Queries
```sql
-- Find recent trials
SELECT 
  t.id,
  t.who,
  tr."blockTime",
  EXISTS(SELECT 1 FROM "TrialResolved" WHERE "trialId" = t.id) as resolved
FROM "Trial" t
JOIN "TrialRegistered" tr2 ON t.id = tr2."trialId"
JOIN "TrialRegisteredEvent" tr ON tr2.id = tr."orderIndex"
ORDER BY tr."blockTime" DESC
LIMIT 10;

-- Find trials with errors
SELECT * FROM "Trial" 
WHERE "id" NOT IN (
  SELECT "trialId" FROM "TrialRegistered"
);
```

## Future Enhancements

1. **Game Result Calculation**
   - Add game-specific logic to calculate results from randomness
   - Update `GameInstance.result` with detailed game outcomes

2. **Casino Association**
   - Link trials to specific casinos via `poolId`
   - Update `Player` stats per casino

3. **Real-time Updates**
   - Publish events to Redis for WebSocket broadcast
   - Notify frontends of trial results

4. **Analytics**
   - Aggregate statistics per pool/casino
   - Track volume, win rates, etc.

5. **Performance Optimization**
   - Batch database operations
   - Cache frequently accessed data
   - Optimize queue processing

## Troubleshooting

### Issue: Events not being processed
**Check:**
- Is the processor running?
- Is Redis running?
- Are there errors in the logs?
- Is the program ID correct?

### Issue: Duplicate key violations
**Solution:** Already handled - processor skips duplicates gracefully

### Issue: Missing pool/trial errors
**Solution:** Events are queued for retry. Ensure events are processed in order.

### Issue: WebSocket connection issues
**Solution:** Use official Solana RPC or ensure your RPC supports `logsSubscribe`

