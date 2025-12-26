// server/src/routes/analytics.routes.js
const router = require('express').Router();
const {
  recordView,
  getOverview,
  getFormAnalytics,
  getFormResponses,
  getFieldAnalytics,
} = require('../controllers/analytics.controller');
const { protect } = require('../middleware/auth');

// public endpoint to record a view
router.post('/forms/:formId/view', recordView);

// authenticated overview for current user
router.get('/overview', protect, getOverview);

// form-specific analytics endpoints (protected)
router.get('/forms/:formId/analytics', protect, getFormAnalytics);
router.get('/forms/:formId/analytics/responses', protect, getFormResponses);
router.get('/forms/:formId/analytics/field/:fieldId', protect, getFieldAnalytics);

module.exports = router;