# Solana Program Integration Guide

This guide explains how to integrate your Fare Vault Solana program with the custom-casino-backend.

## Overview

The backend needs to:
1. Listen for Fare Vault transactions
2. Parse instruction data using the program's IDL
3. Extract bet information
4. Store in database
5. Broadcast to WebSocket

## Setup

### 1. Add Dependencies

```bash
npm install @coral-xyz/anchor --workspace=packages/solana
```

### 2. Copy Your IDL

Copy the `fare_vault.json` IDL from your frontend to the backend:

```bash
cp ../fareplay-solana-frontend/src/artifacts/fare_vault.json \
   packages/solana/src/idl/fare_vault.json
```

### 3. Configure Program ID

Update `.env`:

```env
# From src/artifacts/devnet-config.json or constants.ts
PROGRAM_ID="YourFareVaultProgramID"
NETWORK="devnet"
```

## Parsing Transactions

### Option 1: Using Anchor IDL (Recommended)

The `FareVaultParser` class (in `packages/solana/src/fare-vault-parser.ts`) uses Anchor's BorshCoder to decode instructions:

```typescript
import { FareVaultParser } from '@fareplay/solana';

const parser = new FareVaultParser(config.programId);
const parsed = parser.parseTransaction(transaction);

if (parsed) {
  console.log({
    type: parsed.type,           // 'place_bet' | 'settle_bet'
    player: parsed.player,        // Player wallet address
    amount: parsed.amount,        // Amount in lamports (bigint)
    payout: parsed.payout,        // Payout (if settled)
    won: parsed.won,              // true/false (if settled)
    gameType: parsed.gameType,    // Game identifier
  });
}
```

### Option 2: Manual Parsing

If you prefer manual parsing, decode the instruction data directly:

```typescript
import { Buffer } from 'buffer';
import { struct, u8, u64 } from '@solana/buffer-layout';

// Define your instruction layout based on the Rust program
const PlaceBetLayout = struct([
  u8('instruction'),      // 0 for PlaceBet
  u64('amount'),          // Amount in lamports
  u8('gameType'),         // Game identifier
]);

function parseInstruction(data: Buffer) {
  const decoded = PlaceBetLayout.decode(data);
  return {
    amount: decoded.amount,
    gameType: decoded.gameType,
  };
}
```

## Integration with Event Interpretation Worker

Update `apps/processor/src/workers/event-interpretation-worker.ts`:

```typescript
import { FareVaultParser } from '@fareplay/solana';

const parser = new FareVaultParser(config.programId);

async function parseTransaction(
  signature: string,
  slot: number,
  blockTime: number | null,
  transaction: any
): Promise<any | null> {
  try {
    // Parse using Fare Vault parser
    const parsed = parser.parseTransaction(transaction);
    
    if (!parsed) {
      return null;
    }

    // Map to database format
    return {
      signature,
      slot: BigInt(slot),
      blockTime: blockTime ? new Date(blockTime * 1000) : new Date(),
      playerAddress: parsed.player,
      gameType: parsed.gameType,
      amount: parsed.amount,
      payout: parsed.payout || BigInt(0),
      multiplier: parsed.payout 
        ? Number(parsed.payout) / Number(parsed.amount) 
        : 0,
      won: parsed.won || false,
      status: 'SETTLED' as const,
      metadata: {
        type: parsed.type,
        ...parsed.metadata,
      },
    };
  } catch (error) {
    logger.error({ error, signature }, 'Error parsing transaction');
    return null;
  }
}
```

## Instruction Types

Based on your Fare Vault program, common instructions include:

### PlaceBet
- **Accounts**: [player, vault, systemProgram, ...]
- **Data**: amount, gameType, additional params
- **Event**: Creates a pending bet

### SettleBet
- **Accounts**: [player, vault, authority, ...]
- **Data**: betId, payout, won
- **Event**: Settles a bet with outcome

### Deposit
- **Accounts**: [player, vault, tokenProgram, ...]
- **Data**: amount
- **Event**: Player deposits to vault

### Withdraw
- **Accounts**: [player, vault, authority, ...]
- **Data**: amount
- **Event**: Player withdraws from vault

## Testing

### 1. Test with a Known Transaction

```bash
# Get a transaction from your devnet/mainnet
solana confirm -v <SIGNATURE> --url devnet

# Or use Solana Explorer
https://explorer.solana.com/tx/<SIGNATURE>?cluster=devnet
```

### 2. Test Parser

```typescript
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
    console.log(JSON.stringify(parsed, null, 2));
  }
}

testParse('YOUR_TEST_SIGNATURE');
```

## Monitoring

### View Program Logs

```bash
solana logs <PROGRAM_ID> --url devnet
```

### View Transactions

```bash
solana transaction-history <PROGRAM_ID> --url devnet
```

### Redis Queue Monitoring

```bash
redis-cli
> LLEN bull:blockchain-event:wait
> LLEN bull:event-interpretation:wait
> ZRANGE bull:event-interpretation:failed 0 -1
```

## Common Issues

### Issue: Transactions Not Being Detected

**Check:**
1. Correct `PROGRAM_ID` in `.env`
2. RPC endpoint is accessible
3. Program is deployed to the network you're using

```bash
solana program show <PROGRAM_ID> --url devnet
```

### Issue: Failed to Decode Instruction

**Check:**
1. IDL matches the deployed program version
2. Instruction discriminator is correct
3. Account order matches program

### Issue: Wrong Account Extracted

**Check:**
1. Account indices in parser match your program
2. Use Solana Explorer to verify account order
3. Check if program uses PDAs (Program Derived Addresses)

## Best Practices

1. **Version Your IDL**: Keep IDL in sync with deployed program
2. **Handle Multiple Versions**: Support parsing old and new instruction formats
3. **Log Unknown Instructions**: Don't silently fail on unknown types
4. **Validate Accounts**: Ensure accounts match expected program accounts
5. **Test with Real Transactions**: Use actual devnet/mainnet transactions

## Next Steps

1. Copy your IDL from frontend to backend
2. Update `FareVaultParser` with actual instruction types
3. Test with a known transaction signature
4. Deploy and monitor

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Cookbook](https://solanacookbook.com/)
- [Your Frontend Integration](../fareplay-solana-frontend/src/artifacts/)

