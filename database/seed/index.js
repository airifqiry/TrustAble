import dotenv from 'dotenv';
import { testConnection } from '../db.js';
import { seed as seedMarketplace } from './marketplace.js';
import { seed as seedPhone } from './phone.js';
import { seed as seedPhishing } from './phishing.js';
import { seed as seedGeneral } from './general.js';
import { seed as seedThresholds } from './thresholds.js';

dotenv.config();

async function runAllSeeders() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ShieldAI Database Seeder');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await testConnection();
  await seedThresholds();
  await seedMarketplace();
  await seedPhone();
  await seedPhishing();
  await seedGeneral();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  All seeders completed successfully ✓');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(0);
}

runAllSeeders().catch((err) => {
  console.error('[Seed] Fatal error:', err.message);
  process.exit(1);
});