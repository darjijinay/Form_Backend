// backend/src/routes/slack.routes.js
const router = require('express').Router();
const {
	createSlackIntegration,
	getIntegration,
	updateIntegration,
	deleteIntegration,
	testIntegration,
} = require('../controllers/slack.controller');
const { protect } = require('../middleware/auth');

/**
 * Slack Integration Routes
 * Base: /api/slack
 */

// Create/Setup Slack integration
router.post('/slack', protect, createSlackIntegration);

// Get integration for specific form
router.get('/slack/form/:formId', protect, getIntegration);

// Update integration
router.put('/slack/form/:formId', protect, updateIntegration);

// Delete integration
router.delete('/slack/form/:formId', protect, deleteIntegration);

// Test integration
router.post('/slack/form/:formId/test', protect, testIntegration);

module.exports = router;
