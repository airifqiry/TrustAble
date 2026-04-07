const { pool, testConnection }                           = require('./db');
const { getPatterns, getPatternsByCategories }           = require('./queries/getPatterns');
const { addPattern, bulkAddPatterns, deactivatePattern } = require('./queries/addPattern');
const { getPhoneRisk, getHighRiskPrefixesByRegion }      = require('./queries/getPhoneRisk');
const { getThreshold }                                   = require('./queries/getThreshold');

module.exports = {
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