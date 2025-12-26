// backend/src/routes/sharing.routes.js
const router = require('express').Router();
const {
  shareForm,
  getFormShares,
  updateShare,
  removeShare,
  getSharedWithMe,
} = require('../controllers/sharing.controller');
const { protect } = require('../middleware/auth');

// All sharing routes require authentication
router.use(protect);

// Share a form with another user
router.post('/forms/:formId/share', shareForm);

// Get all shares for a form (owner only)
router.get('/forms/:formId/shares', getFormShares);

// Update share permissions
router.put('/forms/:formId/shares/:shareId', updateShare);

// Remove a share
router.delete('/forms/:formId/shares/:shareId', removeShare);

// Get forms shared with current user
router.get('/shared-with-me', getSharedWithMe);

module.exports = router;
