# FarePlay Casino Backend Architecture

## Overview

The FarePlay Casino Backend is a monorepo containing three main applications and three shared packages, all working together to provide a complete casino backend infrastructure.

## System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Solana    │         │  PostgreSQL  │         │    Redis    │
│  Blockchain │         │   Database   │         │   Pub/Sub   │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │                       │                        │
┌──────┴───────────────────────┴────────────────────────┴──────┐
│                                                                │
│  ┌────────────┐    ┌────────────┐    ┌────────────────────┐  │
│  │ Processor  │───▶│   Redis    │◀───│  WebSocket Server  │  │
│  │  Service   │    │  Pub/Sub   │    │                    │  │
│  └────────────┘    └────────────┘    └────────────────────┘  │
│        │                                        │              │
│        │                                        │              │
│        ▼                                        ▼              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                        │  │
│  │  (Players, Bets, Stats, Events)                        │  │
│  └────────────────────────────────────────────────────────┘  │
│        ▲                                                       │
│        │                                                       │
│  ┌─────┴──────┐                                               │
│  │ API Server │                                               │
│  │  (Fastify) │                                               │
│  └────────────┘                                               │
│        │                                                       │
└────────┼───────────────────────────────────────────────────────┘
         │
         ▼
   ┌─────────────┐
   │   Clients   │
   │ (Frontend,  │
   │  Mobile,    │
   │   etc.)     │
   └─────────────┘
```

## Applications

### 1. API Service (`apps/api`)

**Purpose**: HTTP REST API for casino operations

**Key Responsibilities**:
- User authentication via Solana wallet signatures
- Casino information and statistics endpoints
- Player profile management
- Bet history queries
- Discovery service registration

**Technology Stack**:
- Fastify (HTTP framework)
- @fastify/jwt (JWT authentication)
- @fastify/cors (CORS handling)
- @fastify/helmet (Security headers)
- @fastify/rate-limit (Rate limiting)

**Key Endpoints**:
```
/health                     - Health check
/api/auth/*                 - Authentication
/api/casino/*               - Casino info, stats, leaderboard
/api/player/*               - Player profile, stats
/api/bets/*                 - Bet queries
```

**Port**: 3000 (configurable via `API_PORT`)

### 2. WebSocket Service (`apps/ws`)

**Purpose**: Real-time event broadcasting to connected clients

**Key Responsibilities**:
- Maintain WebSocket connections with clients
- Subscribe to Redis pub/sub for events
- Broadcast events to all connected clients
- Handle client subscriptions and filters
- Connection management and keep-alive

**Technology Stack**:
- ws (WebSocket library)
- ioredis (Redis client)

**Event Types**:
- `bet.placed` - New bet placed
- `bet.settled` - Bet outcome determined
- `jackpot.won` - Jackpot winner
- `player.joined` - New player joined
- `stats.updated` - Casino stats updated
- `chat.message` - Chat message (optional)

**Port**: 3001 (configurable via `WS_PORT`)

**Connection Flow**:
```
Client connects → Receives welcome message → Subscribes to channels
                → Receives real-time events → Sends pings/pongs
```

### 3. Processor Service (`apps/processor`)

**Purpose**: Listen to Solana blockchain events and process transactions

**Key Responsibilities**:
- Poll Solana program for new transactions
- Queue events for processing via BullMQ
- Parse transaction data into bet records
- Store bets in database
- Update player statistics
- Publish events to Redis for broadcasting
- Update casino-wide statistics

**Technology Stack**:
- @solana/web3.js (Solana interaction)
- BullMQ (Queue management)
- Prisma (Database ORM)
- ioredis (Redis for queues and pub/sub)

**Queue-Based Processing Flow**:
```
1. Solana Listener polls for new transactions
   ↓
2. Add to blockchain-event queue (with signature as jobId for deduplication)
   ↓
3. Blockchain Worker: Check if already processed
   ↓
4. Add to event-interpretation queue
   ↓
5. Interpretation Worker: Parse transaction
   ↓
6. Store bet, update player stats
   ↓
7. Publish event to Redis (WebSocket)
   ↓
8. Queue stats-update (debounced)
   ↓
9. Stats Worker: Aggregate and publish stats
```

**Queue Configuration**:
- **Retries**: 3 attempts with exponential backoff
- **Concurrency**: blockchain (5), interpretation (3), stats (1)
- **Job Retention**: Completed (1hr), Failed (24hr)
- **Rate Limiting**: 10 jobs/second max

**Polling Interval**: Configurable via `PROCESSOR_POLL_INTERVAL` (default: 1000ms)

## Shared Packages

### 1. Database Package (`packages/db`)

**Purpose**: Prisma ORM client and database schema

**Exports**:
- `getPrismaClient()` - Singleton Prisma client
- All Prisma types and enums

**Schema Models**:
- `Player` - Player profiles and statistics
- `Bet` - Individual bet records
- `CasinoStats` - Aggregated casino statistics
- `ChatMessage` - Chat messages
- `SystemEvent` - System events and logs

**Technology**:
- Prisma (ORM)
- PostgreSQL (Database)

### 2. Utils Package (`packages/utils`)

**Purpose**: Shared utilities for logging and configuration

**Exports**:
- `logger` - Pino logger instance
- `createLogger(name)` - Create named logger
- `config` - Application configuration
- `loadConfig()` - Load and validate config

**Configuration Management**:
- Loads from environment variables
- Validates required fields
- Provides typed config object
- Uses dotenv for .env file support

**Logging**:
- Structured logging with Pino
- Pretty printing in development
- JSON output in production
- Configurable log levels

### 3. Solana Package (`packages/solana`)

**Purpose**: Solana blockchain interaction utilities

**Exports**:
- `getConnection()` - Singleton Solana connection
- `verifySignature()` - Verify wallet signatures
- `createSignInMessage()` - Create sign-in messages
- `validateSignatureTimestamp()` - Validate message timestamps
- `ProgramListener` - Listen for program transactions

**Key Features**:
- Connection pooling
- Signature verification with tweetnacl
- Transaction parsing
- Event listening with polling

## Data Flow

### 1. Bet Processing Flow

```
Solana Blockchain
    │
    │ 1. Transaction created
    ▼
Processor (ProgramListener)
    │
    │ 2. Poll for new transactions
    │ 3. Parse transaction data
    ▼
PostgreSQL Database
    │
    │ 4. Store bet record
    │ 5. Update player stats
    ▼
Redis Pub/Sub
    │
    │ 6. Publish event
    ▼
WebSocket Server
    │
    │ 7. Broadcast to clients
    ▼
Connected Clients
```

### 2. API Request Flow

```
Client
    │
    │ 1. HTTP Request
    ▼
API Server (Fastify)
    │
    │ 2. Middleware (auth, rate limit, etc.)
    ▼
Route Handler
    │
    │ 3. Query database via Prisma
    ▼
PostgreSQL Database
    │
    │ 4. Return data
    ▼
Client
```

### 3. Authentication Flow

```
Client
    │
    │ 1. Request sign-in message
    ▼
API Server
    │
    │ 2. Generate message with timestamp
    ▼
Client
    │
    │ 3. Sign with Solana wallet
    │ 4. Submit signature
    ▼
API Server
    │
    │ 5. Verify signature
    │ 6. Validate timestamp
    │ 7. Get/create player
    │ 8. Generate JWT
    ▼
Client (stores JWT for future requests)
```

## Deployment Architecture

### Fly.io Deployment

```
┌─────────────────────────────────────────┐
│            Fly.io Platform              │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  App: fareplay-my-casino          │ │
│  │                                   │ │
│  │  Process: api    (Port 80/443)   │ │
│  │  Process: ws     (Port 3001)     │ │
│  │  Process: processor              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  PostgreSQL (Attached)            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Redis (Attached)                 │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Docker Container Structure

```
Multi-stage Build:

Stage 1 (builder):
- Install all dependencies
- Build TypeScript to JavaScript
- Generate Prisma client

Stage 2 (production):
- Copy only production dependencies
- Copy built JavaScript files
- Copy Prisma schema
- Run as non-root user
```

## Communication Patterns

### 1. Synchronous (HTTP)

- Client ↔ API Server
- Request/response pattern
- RESTful endpoints
- JWT authentication

### 2. Asynchronous (WebSocket)

- Client ↔ WebSocket Server
- Bidirectional communication
- Event-driven
- Real-time updates

### 3. Pub/Sub (Redis)

- Processor → Redis → WebSocket Server
- Decoupled services
- Event broadcasting
- Scalable architecture

## Scalability Considerations

### Horizontal Scaling

1. **API Service**: Stateless, can scale horizontally
2. **WebSocket Service**: Requires sticky sessions or Redis adapter
3. **Processor Service**: Should run single instance to avoid duplicate processing

### Performance Optimization

1. **Database**:
   - Indexes on frequently queried fields
   - Connection pooling
   - Query optimization

2. **Redis**:
   - Pub/sub for events
   - Potential for caching (future)
   - Session storage (future)

3. **WebSocket**:
   - Connection limits
   - Message batching
   - Selective broadcasting

## Security

### 1. Authentication

- Solana wallet signature verification
- JWT tokens with expiration
- Timestamp validation (5-minute window)

### 2. API Security

- Helmet (security headers)
- CORS configuration
- Rate limiting
- Input validation

### 3. Database

- Prepared statements (Prisma)
- Connection encryption
- Principle of least privilege

### 4. Environment

- Secrets management
- Environment isolation
- No secrets in code

## Monitoring & Observability

### Logging

- Structured logging with Pino
- Log levels: debug, info, warn, error
- Service-specific loggers
- Request/response logging

### Health Checks

- API health endpoint
- Database connection checks
- Redis connection checks
- Fly.io health checks

### Metrics (Future)

- Transaction processing rate
- API request latency
- WebSocket connection count
- Database query performance

## Future Enhancements

1. **Caching Layer**: Redis caching for frequently accessed data
2. **Analytics**: Detailed analytics and reporting
3. **Admin Dashboard**: Web-based administration
4. **Chat System**: Full chat implementation
5. **Multi-tenancy**: Support multiple casinos in one deployment
6. **GraphQL API**: Alternative to REST API
7. **Webhooks**: Outbound webhooks for integrations
8. **Rate Limiting**: More sophisticated rate limiting strategies
9. **Observability**: Metrics, tracing, and monitoring integrations
10. **Testing**: Comprehensive test suite

## Development Workflow

```
1. Edit code in packages/* or apps/*
2. TypeScript compiler watches for changes
3. Hot reload in development mode
4. Test locally with Docker Compose
5. Deploy using FARETerminal CLI: fare casino deploy
```

## Deployment via FARETerminal CLI

The recommended deployment method is using the FARETerminal CLI, which automates:

1. **Configuration Management**
   - Interactive prompts for all settings
   - Validates environment variables
   - Stores configuration securely

2. **Infrastructure Provisioning**
   - Creates Fly.io app
   - Provisions PostgreSQL and Redis
   - Sets up networking and domains

3. **Secret Management**
   - Securely manages environment variables
   - Generates JWT secrets
   - Stores Solana credentials

4. **Deployment Automation**
   - Builds Docker container
   - Deploys to Fly.io
   - Runs database migrations
   - Registers with Discovery service

5. **Monitoring & Management**
   - View logs: `fare casino logs`
   - Check status: `fare casino status`
   - Update config: `fare casino update`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL
   - Ensure PostgreSQL is running
   - Run migrations

2. **Redis Connection Errors**
   - Check REDIS_URL
   - Ensure Redis is running
   - Check network connectivity

3. **Solana RPC Errors**
   - Rate limiting on public RPC
   - Use custom RPC endpoint
   - Implement retry logic

4. **WebSocket Disconnections**
   - Check keep-alive settings
   - Verify network stability
   - Review client reconnection logic

---

For more information, see the main [README.md](./README.md)

