# Fare Vault Integration

This document explains how the custom-casino-backend integrates with your **Fare Vault Solana program**.

## Program Structure

Based on your IDL (`src/artifacts/fare_vault.json`), the Fare Vault program has:

### Instructions

1. **initialize** - Initialize the vault
   - Accounts: `[authority, vault, systemProgram]`
   - Args: None

2. **deposit** - Deposit SOL to vault
   - Accounts: `[user, vault, userAccount, systemProgram]`
   - Args: `{ amount: u64 }`

3. **withdraw** - Withdraw SOL from vault
   - Accounts: `[user, vault, userAccount]`
   - Args: `{ amount: u64 }`

4. **placeBet** - Place a bet
   - Accounts: `[user, vault, userAccount, bet]`
   - Args: `{ amount: u64, gameType: u8 }`

5. **settleBet** - Settle a bet
   - Accounts: `[authority, vault, bet, userAccount]`
   - Args: `{ payout: u64, won: bool }`

### Accounts

1. **Vault** - Main vault account
   ```rust
   {
     authority: PublicKey,
     totalDeposits: u64,
     totalWithdrawals: u64,
     bump: u8
   }
   ```

2. **UserAccount** - Per-user account (PDA)
   ```rust
   {
     owner: PublicKey,
     balance: u64,
     totalBets: u64,
     totalWins: u64,
     bump: u8
   }
   ```

3. **Bet** - Individual bet account
   ```rust
   {
     user: PublicKey,
     amount: u64,
     gameType: u8,
     settled: bool,
     won: bool,
     payout: u64,
     timestamp: i64
   }
   ```

### Game Types

```typescript
0: 'coinflip'
1: 'dice'
2: 'roulette'
3: 'slots'
4: 'blackjack'
5: 'poker'
6: 'crash'
7: 'mines'
8: 'plinko'
9: 'keno'
```

## How It Works

### Transaction Flow

```
1. Player places bet on-chain (placeBet instruction)
   ↓
2. Solana Listener detects transaction
   ↓
3. Added to blockchain-event queue (BullMQ)
   ↓
4. Blockchain Worker checks for duplicates
   ↓
5. Added to event-interpretation queue
   ↓
6. Interpretation Worker:
   - Parses instruction using FareVaultParser
   - Identifies instruction type (placeBet/settleBet)
   - For settleBet: Fetches bet account to get full details
   - Stores in database
   - Updates player stats
   - Publishes to WebSocket
   ↓
7. Frontend receives real-time update
```

### Parsing Logic

**For `placeBet` transactions:**
```typescript
{
  type: 'place_bet',
  player: accounts[0],        // User wallet
  amount: data.amount,        // Bet amount (u64)
  gameType: GAME_TYPES[data.gameType],  // 0-9 mapped to name
  status: 'PENDING',
  won: false,
  payout: 0
}
```

**For `settleBet` transactions:**
```typescript
// First, fetch bet account data to get original bet details
const betAccount = await getBetAccountData(connection, accounts[2]);

{
  type: 'settle_bet',
  player: betAccount.user,    // Original player
  amount: betAccount.amount,  // Original bet amount
  gameType: betAccount.gameType,
  status: 'SETTLED',
  won: data.won,              // From instruction args
  payout: data.payout,        // From instruction args
  multiplier: payout / amount
}
```

## Database Mapping

### Fare Vault → Database

```
Fare Vault Bet Account          →  Database Bet Record
─────────────────────────────────────────────────────────
user: PublicKey                 →  player.walletAddress
amount: u64                     →  bet.amount (BigInt)
gameType: u8                    →  bet.gameType (string)
settled: bool                   →  bet.status (enum)
won: bool                       →  bet.won (boolean)
payout: u64                     →  bet.payout (BigInt)
timestamp: i64                  →  bet.blockTime (DateTime)
                                →  bet.signature (string)
                                →  bet.slot (BigInt)
```

### Player Stats Updates

When a bet is processed:

```typescript
// Increment counters
player.totalBets += 1
player.totalWagered += bet.amount

if (bet.won) {
  player.totalWins += 1
  player.totalPayout += bet.payout
} else {
  player.totalLosses += 1
}
```

## Configuration

### Environment Variables

```env
# Your Fare Vault program ID (from devnet-config.json or constants.ts)
PROGRAM_ID="FareVaultProgramIDHere"

# Network (must match where your program is deployed)
NETWORK="devnet"  # or "mainnet-beta"

# Solana RPC (use a dedicated RPC for production)
SOLANA_RPC_URL="https://api.devnet.solana.com"
```

### Program IDs

From your `constants.ts` file:

**Devnet:**
```typescript
export const DEVNET_PROGRAM_ID = "...";  // Copy from your constants.ts
```

**Mainnet:**
```typescript
export const MAINNET_PROGRAM_ID = "...";  // Copy from your constants.ts
```

## Testing

### 1. Find a Test Transaction

```bash
# Get recent transactions for your program
solana transaction-history <PROGRAM_ID> --url devnet | head -5

# Or use Solana Explorer
https://explorer.solana.com/address/<PROGRAM_ID>?cluster=devnet
```

### 2. Test the Parser

Create a test script:

```typescript
// test-parser.ts
import { Connection } from '@solana/web3.js';
import { FareVaultParser } from '@fareplay/solana';

const connection = new Connection('https://api.devnet.solana.com');
const parser = new FareVaultParser('YOUR_PROGRAM_ID');

async function testParse(signature: string) {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  
  if (tx) {
    const parsed = parser.parseTransaction(tx);
    console.log('Parsed:', JSON.stringify(parsed, (_, v) => 
      typeof v === 'bigint' ? v.toString() : v, 2
    ));
  }
}

// Test with a real placeBet or settleBet transaction
testParse('YOUR_TEST_SIGNATURE').catch(console.error);
```

### 3. Monitor Processing

```bash
# Watch processor logs
npm run dev:processor

# Check queue status
redis-cli
> LLEN bull:event-interpretation:wait
> LLEN bull:event-interpretation:active
> ZRANGE bull:event-interpretation:failed 0 -1
```

## Common Scenarios

### Scenario 1: Player Places Bet

```
1. Frontend: User clicks "Bet" → placeBet transaction sent
2. Blockchain: Transaction confirmed
3. Backend: 
   - Listener detects transaction
   - Parser extracts: player, amount, gameType
   - Creates PENDING bet in database
   - Publishes "bet.placed" event to WebSocket
4. Frontend: Shows "Bet placed!" notification
```

### Scenario 2: Bet Is Settled

```
1. Blockchain: Authority calls settleBet
2. Backend:
   - Listener detects settleBet transaction
   - Parser extracts: payout, won
   - Fetches bet account to get original bet details
   - Updates bet status to SETTLED
   - Updates player stats (wins/losses)
   - Publishes "bet.settled" event to WebSocket
3. Frontend: Shows win/loss animation
```

### Scenario 3: Player Deposits to Vault

```
1. Frontend: User deposits SOL
2. Backend:
   - Detects deposit transaction
   - Skips (not a bet)
3. Database: Not recorded (deposit tracking optional)
```

## Troubleshooting

### Issue: Bets Not Appearing

**Check:**
1. Correct `PROGRAM_ID` in `.env`
2. Listener is running: `ps aux | grep processor`
3. No errors in logs: `npm run dev:processor`
4. Redis is running: `redis-cli ping`
5. Database is accessible: `npm run db:studio`

### Issue: Failed to Parse Instruction

**Possible causes:**
1. IDL doesn't match deployed program version
2. Instruction data format changed
3. Account order is different

**Debug:**
```typescript
// Add more logging in fare-vault-parser.ts
logger.info({ 
  instructionName: decoded.name,
  accounts: accounts.length,
  data: decoded.data 
}, 'Parsed instruction');
```

### Issue: settleBet Missing Player Info

This is expected! `settleBet` only knows the bet account address. The worker fetches the bet account data to get the original player and bet details.

**If failing:**
- Check RPC connection
- Ensure bet account exists on-chain
- Verify account decoding logic

## Integration with Frontend

Your frontend (`fareplay-solana-frontend`) should:

1. **Place Bets**: Call `placeBet` instruction
2. **Listen for Events**: Connect to WebSocket
3. **Show Results**: Display bet outcomes from events

### WebSocket Events to Handle

```typescript
// Bet placed (from placeBet)
{
  type: 'bet.placed',
  data: {
    signature: '...',
    player: 'abc...xyz',
    gameType: 'coinflip',
    amount: '1000000'
  }
}

// Bet settled (from settleBet)
{
  type: 'bet.settled',
  data: {
    signature: '...',
    player: 'abc...xyz',
    gameType: 'coinflip',
    amount: '1000000',
    payout: '2000000',
    won: true
  }
}
```

## Performance Considerations

### RPC Rate Limits

- Public RPCs have rate limits (1-2 req/sec)
- For settleBet, we fetch bet account data (1 RPC call per bet)
- Recommendation: Use dedicated RPC (Helius, Triton, QuickNode)

### Queue Concurrency

Adjust based on RPC limits:

```typescript
// In event-interpretation-worker.ts
{
  connection,
  concurrency: 3,  // Reduce if hitting RPC limits
}
```

### Caching

Consider caching bet account data:

```typescript
const betCache = new Map<string, BetAccountData>();

// Check cache before fetching
if (!betCache.has(betAccount)) {
  const data = await getBetAccountData(connection, betAccount);
  betCache.set(betAccount, data);
}
```

## Production Checklist

- [ ] Update `PROGRAM_ID` with mainnet program
- [ ] Use dedicated Solana RPC endpoint
- [ ] Set up RPC rate limiting in worker config
- [ ] Monitor failed jobs in BullMQ
- [ ] Set up alerting for processing errors
- [ ] Test with real mainnet transactions
- [ ] Verify bet account parsing is correct
- [ ] Ensure WebSocket events are firing

## Resources

- **Your IDL**: `packages/solana/src/idl/fare_vault.json`
- **Parser**: `packages/solana/src/fare-vault-parser.ts`
- **Worker**: `apps/processor/src/workers/event-interpretation-worker.ts`
- **Frontend Integration**: `../fareplay-solana-frontend/src/artifacts/`

---

Ready to process your Fare Vault transactions! 🎰

