// backend/src/routes/webhook.routes.js
const router = require('express').Router();
const {
  createWebhook,
  getFormWebhooks,
  getWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  getWebhookLogs,
} = require('../controllers/webhook.controller');
const { protect } = require('../middleware/auth');

// All webhook routes require authentication
router.use(protect);

// Create a webhook
router.post('/webhooks', createWebhook);

// Get all webhooks for a form
router.get('/webhooks/form/:formId', getFormWebhooks);

// Get a specific webhook
router.get('/webhooks/:webhookId', getWebhook);

// Update a webhook
router.put('/webhooks/:webhookId', updateWebhook);

// Delete a webhook
router.delete('/webhooks/:webhookId', deleteWebhook);

// Test a webhook
router.post('/webhooks/:webhookId/test', testWebhook);

// Get webhook logs/stats
router.get('/webhooks/:webhookId/logs', getWebhookLogs);

module.exports = router;
