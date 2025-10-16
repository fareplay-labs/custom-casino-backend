import { config } from 'dotenv';
import { resolve } from 'path';
import { getPrismaClient } from './src/index.js';

// Load environment variables from project root
config({ path: resolve(__dirname, '../../.env') });

const db = getPrismaClient();

// Game types with their QK-related and other fields
const games = [
  {
    name: 'coinFlip',
    displayName: 'Coin Flip',
    description: 'Classic heads or tails',
    qkRelatedFields: ['count', 'feeLoss', 'feeMint', 'version'],
    otherFields: ['side'],
  },
  {
    name: 'dice',
    displayName: 'Dice',
    description: 'Roll the dice',
    qkRelatedFields: ['side', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'rps',
    displayName: 'Rock Paper Scissors',
    description: 'Classic rock, paper, scissors',
    qkRelatedFields: ['count', 'feeLoss', 'feeMint', 'version'],
    otherFields: ['side'],
  },
  {
    name: 'bombs',
    displayName: 'Bombs',
    description: 'Minesweeper-style game',
    qkRelatedFields: [
      'count',
      'side.bombCount',
      'side.revealCount',
      'feeLoss',
      'feeMint',
      'version',
    ],
    otherFields: ['side.revealIndexes'],
  },
  {
    name: 'plinko',
    displayName: 'Plinko',
    description: 'Drop the ball',
    qkRelatedFields: ['side.riskLevel', 'side.rowCount', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'crash',
    displayName: 'Crash',
    description: 'Watch the multiplier rise',
    qkRelatedFields: ['side', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'cards',
    displayName: 'Cards',
    description: 'Higher or lower card game',
    qkRelatedFields: ['side', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'cards_1',
    displayName: 'Cards v1',
    description: 'Higher or lower card game (v1)',
    qkRelatedFields: ['side', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'roulette',
    displayName: 'Roulette',
    description: 'Spin the wheel',
    qkRelatedFields: ['count', 'side.rouletteNumberToBetFraction', 'feeLoss', 'feeMint', 'version'],
    otherFields: ['side.uiRepresentation'],
  },
  {
    name: 'slots',
    displayName: 'Slots',
    description: 'Spin to win',
    qkRelatedFields: ['side', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'slots_1',
    displayName: 'Slots v1',
    description: 'Spin to win (v1)',
    qkRelatedFields: ['side', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: [],
  },
  {
    name: 'cryptoLaunch',
    displayName: 'Crypto Launch',
    description: 'Token launch simulator',
    qkRelatedFields: ['side.qkBuildParameters', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: ['side.tradingParameters'],
  },
  {
    name: 'cryptoLaunch_1',
    displayName: 'Crypto Launch v1',
    description: 'Token launch simulator (v1)',
    qkRelatedFields: ['side.qkBuildParameters', 'count', 'feeLoss', 'feeMint', 'version'],
    otherFields: ['side.tradingParameters'],
  },
];

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Seed game types
    console.log('📦 Seeding game types...');
    for (const game of games) {
      await db.game.upsert({
        where: { name: game.name },
        update: {
          displayName: game.displayName,
          description: game.description,
          qkRelatedFields: game.qkRelatedFields,
          otherFields: game.otherFields,
        },
        create: game,
      });
    }
    console.log(`✅ Seeded ${games.length} game types\n`);

    console.log('🎉 Seed completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log(`  - Games: ${games.length}`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

