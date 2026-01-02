const Template = require('../models/Template');
const Form = require('../models/Form');

// Get all templates (premade + user's custom templates)
exports.getTemplates = async (req, res) => {
  try {
    const { category } = req.query;
    const query = {
      isPremade: true,
    };

    // If user is authenticated, also include their custom templates
    if (req.user?.id) {
      query.$or = [
        { isPremade: true },
        { createdBy: req.user.id },
      ];
      delete query.isPremade;
    }

    if (category) {
      query.category = category;
    }

    const templates = await Template.find(query)
      .sort({ isPremade: -1, usageCount: -1, createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message,
    });
  }
};

// Get single template by ID
exports.getTemplateById = async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Allow public access to premade templates, restrict custom templates
    if (!template.isPremade && (!req.user || template.createdBy.toString() !== req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message,
    });
  }
};

// Create custom template from existing form
exports.createTemplate = async (req, res) => {
  try {
    const { formId, name, description, category } = req.body;

    // Get the form to use as template base
    const form = await Form.findOne({
      _id: formId,
      createdBy: req.user.id,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      });
    }

    const template = await Template.create({
      name,
      description,
      category: category || 'other',
      fields: form.fields,
      settings: form.settings,
      createdBy: req.user.id,
      isPremade: false,
    });

    res.status(201).json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create template',
      error: error.message,
    });
  }
};

// Create form from template
exports.createFormFromTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    const { title, description } = req.body;

    const template = await Template.findById(templateId);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    // Check access
    if (!template.isPremade && template.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Create form from template
    const form = await Form.create({
      title: title || template.name,
      description: description || template.description,
      fields: template.fields,
      settings: template.settings,
      createdBy: req.user.id,
    });

    // Increment template usage count
    template.usageCount += 1;
    await template.save();

    res.status(201).json({
      success: true,
      form,
    });
  } catch (error) {
    console.error('Error creating form from template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create form from template',
      error: error.message,
    });
  }
};

// Update custom template
exports.updateTemplate = async (req, res) => {
  try {
    const { name, description, category, fields, settings } = req.body;

    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied',
      });
    }

    if (template.isPremade) {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit premade templates',
      });
    }

    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (category) template.category = category;
    if (fields) template.fields = fields;
    if (settings) template.settings = settings;

    await template.save();

    res.json({
      success: true,
      template,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      error: error.message,
    });
  }
};

// Delete custom template
exports.deleteTemplate = async (req, res) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.user.id,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found or access denied',
      });
    }

    if (template.isPremade) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete premade templates',
      });
    }

    await template.deleteOne();

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message,
    });
  }
};
