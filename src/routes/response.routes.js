// server/src/routes/response.routes.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  submitResponse,
  getResponsesForForm,
  exportResponsesCsv,
} = require('../controllers/response.controller');

// Public: submit a response to a form
router.post('/:formId', submitResponse);

// Protected: list responses
router.get('/form/:formId', protect, getResponsesForForm);

// Protected: export CSV
router.get('/form/:formId/export', protect, exportResponsesCsv);

module.exports = router;
