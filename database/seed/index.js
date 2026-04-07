require('dotenv').config({ path: '../.env' });

const { testConnection }          = require('../db');
const { seed: seedMarketplace }   = require('./marketplace');
const { seed: seedPhone }         = require('./phone');
const { seed: seedPhishing }      = require('./phishing');
const { seed: seedGeneral }       = require('./general');
const { seed: seedThresholds }    = require('./thresholds');

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