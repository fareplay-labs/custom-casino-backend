# FarePlay Casino Backend

A self-hostable Solana-based backend for powering individual casinos on the Fare Protocol. This backend handles casino logic, blockchain event processing, real-time communication, and automatic registration with the Discovery service.

## 🎯 Features

- **REST API** - Fastify-based endpoints for casino operations, player management, and statistics
- **WebSocket Server** - Real-time event broadcasting for bets, jackpots, and casino updates
- **Blockchain Processor** - Listens to Solana program logs and processes on-chain events
- **Database** - PostgreSQL with Prisma ORM for storing player data, bets, and statistics
- **Discovery Integration** - Automatic registration with FarePlay Discovery service
- **Authentication** - Solana wallet signature verification
- **Deployment** - First-class Fly.io support with Docker

## 📁 Project Structure

```
custom-casino-backend/
├── apps/
│   ├── api/              # Fastify REST API
│   ├── ws/               # WebSocket broadcast service
│   └── processor/        # Solana event listener
├── packages/
│   ├── db/               # Prisma client + schema
│   ├── utils/            # Logging, config
│   └── solana/           # Solana RPC + signature helpers
├── Dockerfile            # Production container
├── docker-compose.yml    # Local development services
└── fly.toml              # Fly.io configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **PostgreSQL** 14+
- **Redis** 7+ (for BullMQ queues and WebSocket pub/sub)
- **Solana Program ID** (your casino's on-chain program)
- **FARETerminal CLI** (for deployment) - `npm install -g @fareplay/terminal`

### Local Development

1. **Clone and Setup**

```bash
# Clone the template
git clone <your-repo>
cd custom-casino-backend

# Install dependencies
npm install

# Build packages
npm run build
```

2. **Start Services with Docker Compose**

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

3. **Configure Environment**

Edit `.env` with your configuration:

```env
CASINO_NAME="My FarePlay Casino"
OWNER_WALLET="YourSolanaWalletAddressHere"
PROGRAM_ID="YourProgramIDHere"
NETWORK="devnet"
SOLANA_RPC_URL="https://api.devnet.solana.com"

DATABASE_URL="postgresql://fareplay:fareplay@localhost:5432/fareplay_casino"
REDIS_URL="redis://localhost:6379"

DISCOVERY_URL="https://discover.fareplay.io"
DISCOVERY_API_KEY="your-api-key"

JWT_SECRET="your-secret-key-change-in-production"
```

4. **Initialize Database**

```bash
npm run db:push
```

5. **Start Development Servers**

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:api         # API on port 3000
npm run dev:ws          # WebSocket on port 3001
npm run dev:processor   # Solana processor
```

6. **Test the API**

```bash
curl http://localhost:3000/health
# Returns: {"status":"ok","timestamp":"...","casino":"My FarePlay Casino"}
```

## 🔴 Redis Usage

Redis is used for two purposes in this backend:

1. **BullMQ Queues** - Reliable job processing with retries
   - blockchain-event queue
   - event-interpretation queue
   - stats-update queue

2. **WebSocket Pub/Sub** - Real-time event broadcasting
   - casino:events channel

Both use the same Redis instance (configurable via `REDIS_URL`).

## 🌐 API Endpoints

### Authentication

- `GET /api/auth/message?walletAddress={address}` - Get message to sign
- `POST /api/auth/signin` - Sign in with wallet signature
- `GET /api/auth/verify` - Verify JWT token

### Casino

- `GET /api/casino/info` - Get casino information
- `GET /api/casino/stats` - Get casino statistics
- `GET /api/casino/activity?limit=20` - Get recent activity
- `GET /api/casino/leaderboard?limit=10` - Get player leaderboard

### Player (Authenticated)

- `GET /api/player/profile` - Get player profile
- `PATCH /api/player/profile` - Update player profile
- `GET /api/player/stats` - Get player statistics

### Bets

- `GET /api/bets/:signature` - Get bet by transaction signature
- `GET /api/bets/recent?limit=20` - Get recent bets
- `GET /api/bets/player/history?limit=20&offset=0` - Get player bet history (authenticated)

## 🔌 WebSocket Events

Connect to `ws://localhost:3001/ws`

### Client → Server

```json
{
  "type": "ping"
}

{
  "type": "subscribe",
  "channels": ["bets", "jackpots", "stats"]
}
```

### Server → Client

```json
{
  "type": "bet.placed",
  "data": {
    "signature": "...",
    "player": "abc...xyz",
    "gameType": "slots",
    "amount": "1000000"
  },
  "timestamp": 1234567890
}

{
  "type": "bet.settled",
  "data": {
    "signature": "...",
    "player": "abc...xyz",
    "won": true,
    "payout": "2000000"
  },
  "timestamp": 1234567890
}

{
  "type": "stats.updated",
  "data": {
    "totalBets": "1234",
    "totalPlayers": 56
  },
  "timestamp": 1234567890
}
```

## 🚢 Deployment

### Using FARETerminal CLI (Recommended)

The easiest way to deploy your casino is using the FARETerminal CLI:

```bash
# Install FARETerminal globally
npm install -g @fareplay/terminal

# Initialize and configure your casino
fare casino init

# Deploy to Fly.io
fare casino deploy
```

The CLI will:
- Guide you through configuration
- Create a Fly.io app
- Provision PostgreSQL database
- Provision Redis (for BullMQ + WebSocket)
- Set environment secrets
- Deploy the application
- Register with Discovery service

### Manual Deployment (Fly.io)

```bash
# Create app
fly apps create fareplay-my-casino

# Create and attach PostgreSQL
fly postgres create --name fareplay-my-casino-db
fly postgres attach fareplay-my-casino-db

# Create and attach Redis (for BullMQ queues + WebSocket pub/sub)
fly redis create --name fareplay-my-casino-redis --region iad --plan free
fly redis attach fareplay-my-casino-redis --app fareplay-my-casino

# Set secrets
fly secrets set \
  CASINO_NAME="My Casino" \
  OWNER_WALLET="..." \
  PROGRAM_ID="..." \
  NETWORK="mainnet-beta" \
  JWT_SECRET="..."

# Deploy
fly deploy
```

### Manual Deployment (Docker)

```bash
# Build image
docker build -t fareplay-casino .

# Run API
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  fareplay-casino node apps/api/dist/index.js

# Run WebSocket
docker run -p 3001:3001 \
  -e REDIS_URL="..." \
  fareplay-casino node apps/ws/dist/index.js

# Run Processor
docker run \
  -e DATABASE_URL="..." \
  -e REDIS_URL="..." \
  -e PROGRAM_ID="..." \
  fareplay-casino node apps/processor/dist/index.js
```

## 🔐 Authentication Flow

1. Client requests a sign-in message:
   ```
   GET /api/auth/message?walletAddress=ABC123...
   ```

2. Client signs the message with their Solana wallet

3. Client submits the signature:
   ```json
   POST /api/auth/signin
   {
     "walletAddress": "ABC123...",
     "message": "Sign in to FarePlay Casino...",
     "signature": "base58_signature"
   }
   ```

4. Server verifies signature and returns JWT token

5. Client includes token in subsequent requests:
   ```
   Authorization: Bearer <jwt_token>
   ```

## 🗄️ Database

### Schema

The database includes:
- **Player** - Player profiles and statistics
- **Bet** - Individual bet records
- **CasinoStats** - Aggregated casino statistics
- **ChatMessage** - Chat messages (optional)
- **SystemEvent** - System events and logs

### Commands

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Create migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CASINO_NAME` | Yes | - | Casino display name |
| `OWNER_WALLET` | Yes | - | Owner's Solana wallet address |
| `PROGRAM_ID` | Yes | - | Solana program ID |
| `NETWORK` | No | `devnet` | Solana network (devnet/mainnet-beta) |
| `SOLANA_RPC_URL` | No | - | Custom Solana RPC URL |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `DISCOVERY_URL` | No | `https://discover.fareplay.io` | Discovery service URL |
| `DISCOVERY_API_KEY` | No | - | Discovery service API key |
| `API_PORT` | No | `3000` | API server port |
| `WS_PORT` | No | `3001` | WebSocket server port |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `LOG_LEVEL` | No | `info` | Logging level |
| `NODE_ENV` | No | `development` | Environment mode |

## 📊 Monitoring

### Logs

```bash
# Development
npm run dev         # Outputs to console

# Production (Fly.io)
fly logs            # Live logs
fly logs --app my-casino  # Specific app
```

### Health Checks

- **API**: `GET /health`
- **WebSocket**: Connect to `/ws` and send `{"type":"ping"}`

### Metrics

The processor logs statistics about:
- Transaction processing rate
- Database operations
- Error rates
- Connected WebSocket clients

## 🔄 Integration with FarePlay SDK

The backend integrates with `@fareplay/sdk` for Discovery service registration:

```typescript
import { DiscoveryClient } from '@fareplay/sdk';

const client = new DiscoveryClient(
  config.discoveryUrl,
  config.discoveryApiKey
);

await client.register({
  name: config.casinoName,
  owner: config.ownerWallet,
  network: config.network,
  apiUrl: 'https://my-casino.fly.dev',
  wsUrl: 'wss://my-casino.fly.dev:3001',
});

// Periodic heartbeat
setInterval(() => client.heartbeat(), 60000);
```

## 🛠️ Development

### Building

```bash
# Build all packages and apps
npm run build

# Build specific workspace
npm run build --workspace=apps/api
```

### Testing

```bash
# Type checking
npm run type-check

# Linting
npm run lint
```

### Adding Dependencies

```bash
# Root dependencies
npm install <package>

# Workspace dependencies
npm install <package> --workspace=apps/api
```

## 🔧 Customization

### Custom Game Types

Edit the transaction parser in `apps/processor/src/event-processor.ts`:

```typescript
private async parseTransaction(event: ProgramEvent) {
  // Add your program-specific parsing logic
  const instruction = /* decode instruction */;
  
  return {
    gameType: instruction.gameType,
    amount: instruction.amount,
    // ... other fields
  };
}
```

### Custom Events

Add event types in `apps/ws/src/broadcaster.ts`:

```typescript
export type EventType = 
  | 'bet.placed'
  | 'your.custom.event';
```

## 🤝 Contributing

This is a template repository. Feel free to fork and customize for your casino!

## 📝 License

MIT License - See LICENSE file for details

## 🆘 Support

- Documentation: https://docs.fareplay.io
- Discord: https://discord.gg/fareplay
- Issues: Use GitHub Issues

## 🚀 Next Steps

1. Install FARETerminal CLI: `npm install -g @fareplay/terminal`
2. Configure your casino: `fare casino init`
3. Deploy your Solana program
4. Update the transaction parser with your program's instruction format
5. Deploy your backend: `fare casino deploy`
6. Build your casino frontend!

## 🔧 FARETerminal CLI Commands

The FARETerminal CLI provides commands for managing your casino:

- `fare casino init` - Initialize a new casino configuration
- `fare casino deploy` - Deploy casino to Fly.io
- `fare casino logs` - View casino logs
- `fare casino status` - Check casino status
- `fare casino update` - Update casino configuration
- `fare casino secrets` - Manage secrets

For full CLI documentation, visit: https://github.com/fareplay/FARETerminal

---

Built with ❤️ for the FarePlay Protocol

