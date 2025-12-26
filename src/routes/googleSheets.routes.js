// backend/src/routes/googleSheets.routes.js
const router = require('express').Router();
const {
  getAuthUrl,
  handleCallback,
  setupGoogleSheets,
  getIntegration,
  disconnect,
  bulkSync,
  toggleSyncOnSubmit,
} = require('../controllers/googleSheets.controller');
const { protect } = require('../middleware/auth');

// Get auth URL (no auth needed for this)
router.get('/google-sheets/auth-url', getAuthUrl);

// Google OAuth callback (no auth needed)
router.get('/google-sheets/callback', protect, handleCallback);

// All other routes require authentication
router.use(protect);

// Setup Google Sheets
router.post('/google-sheets/setup', setupGoogleSheets);

// Get integration for a form
router.get('/google-sheets/form/:formId', getIntegration);

// Disconnect Google Sheets
router.delete('/google-sheets/form/:formId', disconnect);

// Bulk sync
router.post('/google-sheets/form/:formId/sync', bulkSync);

// Toggle sync on submit
router.put('/google-sheets/form/:formId/toggle-sync', toggleSyncOnSubmit);

module.exports = router;
