import { pool, testConnection } from './db.js';
import { getPatterns, getPatternsByCategories } from './queries/getPatterns.js';
import { addPattern, bulkAddPatterns, deactivatePattern } from './queries/addPattern.js';
import { getPhoneRisk, getHighRiskPrefixesByRegion } from './queries/getPhoneRisk.js';
import { getThreshold } from './queries/getThreshold.js';

export {
  pool,
  testConnection,
  getPatterns,
  getPatternsByCategories,
  addPattern,
  bulkAddPatterns,
  deactivatePattern,
  getPhoneRisk,
  getHighRiskPrefixesByRegion,
  getThreshold,
};