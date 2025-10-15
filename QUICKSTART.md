# FarePlay Casino Backend - Quick Start

This is a template repository for creating your own Solana-based casino on the FarePlay Protocol.

## What is this?

This backend provides everything you need to run a casino:
- ✅ REST API for casino operations
- ✅ WebSocket server for real-time updates
- ✅ Solana blockchain event processor
- ✅ Database with Prisma ORM
- ✅ Wallet signature authentication
- ✅ Discovery service integration
- ✅ Fly.io deployment ready

## Getting Started

### 1. Install FARETerminal CLI

```bash
npm install -g @fareplay/terminal
```

### 2. Clone this template

```bash
git clone https://github.com/fareplay/custom-casino-backend.git my-casino
cd my-casino
```

### 3. Install dependencies

```bash
npm install
```

### 4. Local Development

Start local services (PostgreSQL & Redis):
```bash
docker-compose up -d
```

Copy environment template:
```bash
cp .env.example .env
```

Edit `.env` with your configuration, then:

```bash
# Initialize database
npm run db:push

# Build all packages
npm run build

# Start all services
npm run dev
```

Your casino is now running:
- API: http://localhost:3000
- WebSocket: ws://localhost:3001/ws
- Health: http://localhost:3000/health

### 5. Deploy to Production

```bash
# Initialize casino configuration
fare casino init

# Deploy to Fly.io
fare casino deploy
```

That's it! Your casino is live 🎰

## What's Next?

1. **Customize the transaction parser** in `apps/processor/src/event-processor.ts` to match your Solana program's instruction format

2. **Build your frontend** that connects to your casino's API and WebSocket

3. **Configure your games** by implementing game-specific logic

4. **Monitor your casino** using `fare casino logs` and `fare casino status`

## Project Structure

```
apps/
├── api/        - REST API (Fastify)
├── ws/         - WebSocket server
└── processor/  - Solana event listener

packages/
├── db/         - Database (Prisma)
├── utils/      - Shared utilities
└── solana/     - Solana helpers
```

## Key Files to Customize

- `packages/db/prisma/schema.prisma` - Database schema
- `apps/processor/src/event-processor.ts` - Transaction parsing logic
- `apps/api/src/routes/*.ts` - API endpoints
- `.env` - Environment configuration

## Need Help?

- 📚 Full docs: [README.md](./README.md)
- 🏗️ Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 💬 Discord: https://discord.gg/fareplay
- 🐛 Issues: GitHub Issues

---

Happy building! 🚀


