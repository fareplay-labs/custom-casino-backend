# Processor Service

The Processor service handles blockchain event processing using a queue-based architecture with BullMQ.

## Architecture

```
┌─────────────────┐
│ Solana Listener │ (Polls blockchain)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  blockchain-event Queue     │
│  (Deduplication by sig)     │
└────────┬────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Blockchain Worker           │
│  (Checks for duplicates)     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  event-interpretation Queue  │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Interpretation Worker       │
│  (Parse, store, publish)     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  stats-update Queue          │
│  (Debounced, singleton)      │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Stats Worker                │
│  (Aggregate & publish)       │
└──────────────────────────────┘
```

## Queues

### 1. blockchain-event

**Purpose**: Receive raw blockchain transactions

**Job Data**:
```typescript
{
  signature: string;
  slot: number;
  blockTime: number | null;
  transaction: any;
}
```

**Options**:
- Job ID: Transaction signature (prevents duplicates)
- Priority: 1
- Concurrency: 5 workers

### 2. event-interpretation

**Purpose**: Parse transactions and store in database

**Job Data**: Same as blockchain-event

**Processing**:
1. Parse transaction based on program structure
2. Get or create player
3. Store bet record
4. Update player statistics
5. Publish bet event to WebSocket
6. Queue stats update

**Options**:
- Concurrency: 3 workers
- Retries: 3 attempts
- Backoff: Exponential (1s, 2s, 4s)

### 3. stats-update

**Purpose**: Update casino-wide statistics

**Job Data**: Empty (singleton job)

**Processing**:
1. Aggregate all bets
2. Count players
3. Update or create CasinoStats record
4. Publish stats event to WebSocket

**Options**:
- Job ID: 'update-stats-singleton' (only one at a time)
- Delay: 5 seconds (debounced)
- Concurrency: 1 worker

## Workers

### Blockchain Event Worker

**Location**: `src/workers/blockchain-event-worker.ts`

**Responsibilities**:
- Check for duplicate events
- Queue events for interpretation

**Configuration**:
- Concurrency: 5
- Rate limit: 10 jobs/second

### Event Interpretation Worker

**Location**: `src/workers/event-interpretation-worker.ts`

**Responsibilities**:
- Parse Solana transactions
- Extract bet data
- Store in database
- Publish events

**Customization Point**: Update `parseTransaction()` function to match your program's instruction format.

### Stats Update Worker

**Location**: `src/workers/stats-update-worker.ts`

**Responsibilities**:
- Aggregate casino statistics
- Update database
- Publish to WebSocket

**Configuration**:
- Concurrency: 1 (prevents race conditions)

## Customization

### Parsing Your Program's Instructions

Edit `apps/processor/src/workers/event-interpretation-worker.ts`:

```typescript
async function parseTransaction(
  signature: string,
  slot: number,
  blockTime: number | null,
  transaction: any
): Promise<any | null> {
  // 1. Get account keys
  const accountKeys = transaction.transaction.message.accountKeys;
  
  // 2. Find your program's instruction
  const instruction = transaction.transaction.message.instructions.find(
    (ix: any) => ix.programId.toString() === config.programId
  );
  
  // 3. Decode instruction data (use your program's IDL)
  const decoded = decodeInstruction(instruction.data);
  
  // 4. Return parsed data
  return {
    signature,
    slot: BigInt(slot),
    blockTime: blockTime ? new Date(blockTime * 1000) : new Date(),
    playerAddress: accountKeys[decoded.playerAccountIndex].toString(),
    gameType: decoded.gameType,
    amount: BigInt(decoded.amount),
    payout: BigInt(decoded.payout),
    // ...
  };
}
```

## Monitoring

### Redis CLI

```bash
redis-cli

# List all queues
KEYS bull:*

# Get queue length
LLEN bull:blockchain-event:wait

# View job data
HGETALL bull:blockchain-event:1

# View failed jobs
ZRANGE bull:blockchain-event:failed 0 -1
```

### BullMQ Board (Optional)

Install and run [Bull Board](https://github.com/felixmosh/bull-board) for a web UI:

```bash
npm install @bull-board/api @bull-board/fastify
```

### Logs

```bash
# Development
npm run dev

# Production
pm2 logs processor
```

## Error Handling

### Retry Logic

Jobs automatically retry 3 times with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay
- Attempt 4: 4 seconds delay

### Failed Jobs

Failed jobs are kept for 24 hours for debugging:

```bash
# View failed jobs
redis-cli ZRANGE bull:blockchain-event:failed 0 -1
```

### Manual Retry

```typescript
import { Queue } from 'bullmq';

const queue = new Queue('blockchain-event', { connection });
await queue.retryJobs({ count: 10 });
```

## Performance Tips

1. **Adjust Concurrency**: Increase worker concurrency for higher throughput
2. **Rate Limiting**: Adjust rate limiter based on your RPC limits
3. **Job Retention**: Reduce retention time to save Redis memory
4. **Batch Processing**: Group multiple events in interpretation worker
5. **Stats Debouncing**: Increase stats update delay for less frequent updates

## Troubleshooting

### Jobs Getting Stuck

```bash
# Clean stuck jobs
redis-cli KEYS bull:*:active | xargs redis-cli DEL
```

### High Memory Usage

```bash
# Clear completed jobs
redis-cli KEYS bull:*:completed | xargs redis-cli DEL
```

### Slow Processing

1. Check worker concurrency
2. Check database connection pool
3. Monitor Solana RPC performance
4. Check Redis performance

