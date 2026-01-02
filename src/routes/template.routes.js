const router = require('express').Router();
const { protect } = require('../middleware/auth');
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  createFormFromTemplate,
  updateTemplate,
  deleteTemplate,
} = require('../controllers/template.controller');

// Get all templates
router.get('/', getTemplates);

// Get single template
router.get('/:id', getTemplateById);

// Create custom template from form
router.post('/', protect, createTemplate);

// Create form from template
router.post('/:templateId/use', protect, createFormFromTemplate);

// Update custom template
router.put('/:id', protect, updateTemplate);

// Delete custom template
router.delete('/:id', protect, deleteTemplate);

module.exports = router;
