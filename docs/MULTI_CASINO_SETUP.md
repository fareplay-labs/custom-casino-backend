# Multi-Casino Backend Setup

The custom-casino-backend now supports **multiple casinos** running on a single backend instance!

## Architecture

```
┌─────────────────────────────────────────┐
│     One Backend Instance                │
│                                         │
│  Casino A          Casino B             │
│  (poolId: ABC)     (poolId: XYZ)        │
│  - Players         - Players            │
│  - Bets            - Bets               │
│  - Stats           - Stats              │
└─────────────────────────────────────────┘
         │
         ▼
    Shared Resources:
    - PostgreSQL
    - Redis/BullMQ
    - Solana Listener
```

## Benefits

- ✅ **Cost Efficient** - One backend serves multiple casinos
- ✅ **Simplified Ops** - One deployment, one database, one Redis
- ✅ **Shared Infrastructure** - Solana listener processes all casinos
- ✅ **Isolated Data** - Each casino has separate players, bets, stats

## How It Works

### 1. Casino Registration

Casinos are stored in the database with:
- **Unique slug** - URL-friendly identifier (`my-casino`)
- **Owner wallet** - Wallet that owns the casino
- **Pool ID** - Fare Vault pool ID (for matching transactions)
- **Metadata** - Name, description, logo, theme, etc.

### 2. Transaction Routing

When a transaction is detected:

```
1. Processor detects trial_register or trial_resolve
2. Extracts poolId from transaction metadata
3. Looks up casino by poolId in database
4. Associates bet with that casino
5. Updates casino-specific stats
```

### 3. API Access

Clients specify which casino they're accessing:

**Option 1: Query Parameter**
```
GET /api/casino/info?casino=my-casino
GET /api/casino/stats?casino=my-casino
```

**Option 2: Header**
```
GET /api/casino/info
X-Casino-Slug: my-casino
```

**Option 3: Subdomain (future)**
```
my-casino.fareplay.io → Automatically routes to casino with slug "my-casino"
```

## Setup Guide

### Step 1: Deploy Backend

```bash
# Deploy the backend (one instance)
fare casino deploy

# Or manual deployment
fly deploy
```

### Step 2: Create Casinos

Use the Admin API to create casinos:

```bash
curl -X POST http://localhost:3000/api/admin/casinos \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Casino",
    "slug": "my-casino",
    "ownerWallet": "YourSolanaWalletHere",
    "poolId": "YourFareVaultPoolID",
    "description": "The best casino on Solana",
    "frontendUrl": "https://my-casino.com"
  }'
```

Response:
```json
{
  "casino": {
    "id": "uuid-here",
    "name": "My Casino",
    "slug": "my-casino",
    "ownerWallet": "...",
    "status": "ACTIVE",
    "createdAt": "2024-..."
  }
}
```

### Step 3: Configure Frontend

Point your frontend to the backend with the casino slug:

```typescript
const API_URL = 'https://your-backend.fly.dev/api';
const CASINO_SLUG = 'my-casino';

// Add slug to all requests
fetch(`${API_URL}/casino/info?casino=${CASINO_SLUG}`)

// Or use header
fetch(`${API_URL}/casino/info`, {
  headers: {
    'X-Casino-Slug': CASINO_SLUG
  }
})
```

## Admin API Endpoints

### Create Casino
```
POST /api/admin/casinos
{
  "name": "Casino Name",
  "slug": "url-slug",
  "ownerWallet": "wallet-address",
  "poolId": "fare-vault-pool-id",
  "description": "Optional description",
  "frontendUrl": "https://casino.com",
  "config": { /* game settings */ }
}
```

### List Casinos
```
GET /api/admin/casinos
```

### Get Casino
```
GET /api/admin/casinos/:slug
```

### Update Casino
```
PATCH /api/admin/casinos/:slug
{
  "name": "New Name",
  "description": "Updated description",
  "status": "MAINTENANCE",
  "theme": { "primaryColor": "#ff0000" }
}
```

### Delete Casino
```
DELETE /api/admin/casinos/:slug
```

## Casino-Scoped Data

### Players

Players are scoped per casino:
- Same wallet can play at multiple casinos
- Each casino tracks stats independently
- Unique constraint: `(casinoId, walletAddress)`

```typescript
// Player at Casino A
{
  casinoId: "casino-a-id",
  walletAddress: "ABC123",
  totalBets: 100,
  totalWins: 50
}

// Same wallet at Casino B
{
  casinoId: "casino-b-id",
  walletAddress: "ABC123",  // Same wallet!
  totalBets: 25,
  totalWins: 10
}
```

### Bets

All bets are associated with a casino:
```sql
SELECT * FROM "Bet" WHERE "casinoId" = 'casino-a-id';
```

### Stats

Stats are calculated per casino:
```sql
SELECT * FROM "CasinoStats" WHERE "casinoId" = 'casino-a-id';
```

## Pool ID Mapping

**Critical:** Each casino must have a unique Fare Vault `poolId`:

1. **Create pool on-chain** using `pool_register` instruction
2. **Get the pool account address**
3. **Set in casino config**: `poolId: "PoolAccountAddress"`

The processor uses `poolId` to route transactions to the correct casino.

## Environment Variables

**Removed (now in database):**
- ~~`CASINO_NAME`~~
- ~~`OWNER_WALLET`~~

**Still required (global):**
- `PROGRAM_ID` - Fare Vault program ID
- `NETWORK` - Solana network
- `DATABASE_URL` - Shared database
- `REDIS_URL` - Shared Redis
- `JWT_SECRET` - Shared auth

## Database Schema

### Casino Model

```prisma
model Casino {
  id              String
  name            String
  slug            String   @unique
  ownerWallet     String
  programId       String
  network         String
  poolId          String?  // Fare Vault pool ID
  apiUrl          String?
  wsUrl           String?
  frontendUrl     String?
  description     String?
  logo            String?
  banner          String?
  theme           Json?
  config          Json?
  status          CasinoStatus
  isPublic        Boolean
  
  players         Player[]
  bets            Bet[]
  stats           CasinoStats[]
}
```

## Migration from Single Casino

If you had a single-casino backend:

```sql
-- Insert your existing casino
INSERT INTO "Casino" (
  id, name, slug, "ownerWallet", "programId", network, "poolId"
) VALUES (
  gen_random_uuid(),
  'My Casino',
  'my-casino',
  'YourWalletAddress',
  'FAREvmepkHArRWwLjHmwPQGL9Byg8iKF3hu1vewxTSXe',
  'devnet',
  'YourPoolID'
);

-- Update all existing players
UPDATE "Player" SET "casinoId" = (SELECT id FROM "Casino" WHERE slug = 'my-casino');

-- Update all existing bets
UPDATE "Bet" SET "casinoId" = (SELECT id FROM "Casino" WHERE slug = 'my-casino');
```

## Scaling Considerations

### Horizontal Scaling

With multiple casinos:
- **API**: Fully stateless, scales horizontally
- **WebSocket**: Can scale with Redis adapter
- **Processor**: Single instance (handles all casinos)

### Performance

- **Database**: Indexed on `casinoId` for fast queries
- **BullMQ**: Shared queues (all casinos)
- **Stats**: Debounced per casino (5 sec delay)

### Limits

Recommended limits per backend instance:
- **Casinos**: 100-500 (depends on traffic)
- **Transactions/sec**: ~50-100 (limited by Solana RPC)
- **WebSocket connections**: 10,000+ (with Redis adapter)

## Monitoring

### Per-Casino Metrics

```bash
# Get stats for specific casino
curl "http://localhost:3000/api/casino/stats?casino=my-casino"

# List all casinos
curl "http://localhost:3000/api/admin/casinos"
```

### Database Queries

```sql
-- Count bets per casino
SELECT c.name, COUNT(b.id) as bet_count
FROM "Casino" c
LEFT JOIN "Bet" b ON b."casinoId" = c.id
GROUP BY c.id, c.name;

-- Active players per casino
SELECT c.name, COUNT(DISTINCT p.id) as player_count
FROM "Casino" c
LEFT JOIN "Player" p ON p."casinoId" = c.id
WHERE p."lastSeenAt" > NOW() - INTERVAL '24 hours'
GROUP BY c.id, c.name;
```

## Best Practices

1. **Use Unique Pool IDs** - Each casino needs its own Fare Vault pool
2. **Index poolId** - Add database index if you have many casinos
3. **Cache Casino Lookups** - Cache poolId→casinoId mapping in Redis
4. **Monitor Per Casino** - Track metrics separately for each casino
5. **Isolate Failures** - One casino's issues shouldn't affect others

## Future Enhancements

- **Subdomain Routing** - Auto-detect casino from subdomain
- **Casino API Keys** - Authenticate frontend requests per casino
- **Resource Limits** - CPU/memory quotas per casino
- **White Labeling** - Custom domains per casino
- **Casino Analytics** - Detailed per-casino dashboards

---

Ready to run multiple casinos on one backend! 🎰🎰🎰

