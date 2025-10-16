import { getPrismaClient } from '@fareplay/db';

const db = getPrismaClient();

async function check() {
  const counts = {
    users: await db.user.count(),
    pools: await db.pool.count(),
    trials: await db.trial.count(),
    trialRegisteredEvents: await db.trialRegisteredEvent.count(),
    trialResolvedEvents: await db.trialResolvedEvent.count(),
    games: await db.game.count(),
    gameConfigs: await db.gameConfig.count(),
    qkConfigs: await db.qkWithConfigRegistered.count(),
  };

  console.log('\n📊 Database Counts:');
  console.log(JSON.stringify(counts, null, 2));

  if (counts.trials > 0) {
    const trials = await db.trial.findMany({ 
      take: 5, 
      include: { 
        trialRegistered: { 
          include: { trialRegisteredEvent: true } 
        } 
      } 
    });
    console.log('\n🎲 Sample Trials:');
    trials.forEach(t => {
      console.log(`  - ${t.id.slice(0, 8)}... | who: ${t.who.slice(0, 8)}... | pool: ${t.poolAddress.slice(0, 8)}...`);
    });
  }

  await db.$disconnect();
}

check();

