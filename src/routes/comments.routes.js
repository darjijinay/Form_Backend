// backend/src/routes/comments.routes.js
const router = require('express').Router();
const {
  addComment,
  getResponseComments,
  updateComment,
  deleteComment,
  toggleLike,
  toggleResolve,
} = require('../controllers/comments.controller');
const { protect } = require('../middleware/auth');

// All comment routes require authentication
router.use(protect);

// Add comment to a response
router.post('/forms/:formId/responses/:responseId/comments', addComment);

// Get all comments for a response
router.get('/forms/:formId/responses/:responseId/comments', getResponseComments);

// Update a comment
router.put('/comments/:commentId', updateComment);

// Delete a comment
router.delete('/comments/:commentId', deleteComment);

// Like/unlike a comment
router.post('/comments/:commentId/like', toggleLike);

// Resolve/unresolve a comment
router.post('/comments/:commentId/resolve', toggleResolve);

module.exports = router;
