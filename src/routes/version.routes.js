// backend/src/routes/version.routes.js
const router = require('express').Router();
const {
  createVersion,
  getFormVersions,
  getVersion,
  rollbackVersion,
  compareVersions,
} = require('../controllers/version.controller');
const { protect } = require('../middleware/auth');

// All version routes require authentication
router.use(protect);

// Create a new version
router.post('/forms/:formId/versions', createVersion);

// Get all versions for a form
router.get('/forms/:formId/versions', getFormVersions);

// Get a specific version
router.get('/forms/:formId/versions/:versionNumber', getVersion);

// Rollback to a specific version
router.post('/forms/:formId/versions/:versionNumber/rollback', rollbackVersion);

// Compare two versions
router.get('/forms/:formId/versions/compare', compareVersions);

module.exports = router;
