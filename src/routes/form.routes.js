// server/src/routes/form.routes.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  createForm,
  getMyForms,
  getFormById,
  getPublicForm,
  updateForm,
  deleteForm,
} = require('../controllers/form.controller');

router.post('/', protect, createForm);
router.get('/', protect, getMyForms);
router.get('/:id', protect, getFormById);
router.put('/:id', protect, updateForm);
router.delete('/:id', protect, deleteForm);

// public access for filling forms
router.get('/:id/public', getPublicForm);

module.exports = router;
