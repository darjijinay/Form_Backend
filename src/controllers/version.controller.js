// backend/src/controllers/version.controller.js
const Form = require('../models/Form');
const FormVersion = require('../models/FormVersion');

/**
 * Create a new version of a form
 * POST /forms/:formId/versions
 */
exports.createVersion = async (req, res) => {
  try {
    const { formId } = req.params;
    const { changesSummary, publish } = req.body;

    // Verify form exists and user is owner
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to version this form' });
    }

    // Get next version number
    const lastVersion = await FormVersion.findOne({ form: formId }).sort({ versionNumber: -1 });
    const nextVersion = (lastVersion?.versionNumber || 0) + 1;

    // Create new version
    const version = await FormVersion.create({
      form: formId,
      versionNumber: nextVersion,
      fields: form.fields || [],
      settings: {
        title: form.title,
        description: form.description,
        publicForm: form.publicForm,
      },
      createdBy: req.user.id,
      changesSummary: changesSummary || '',
      isPublished: publish === true,
    });

    res.status(201).json({
      success: true,
      message: 'Version created successfully',
      data: version,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating version',
      error: error.message,
    });
  }
};

/**
 * Get all versions of a form
 * GET /forms/:formId/versions
 */
exports.getFormVersions = async (req, res) => {
  try {
    const { formId } = req.params;

    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    // Check authorization - owner or shared editor/viewer
    const isOwner = form.owner.toString() === req.user.id;
    const isShared = form.sharedWith?.some(
      (share) => share.user.toString() === req.user.id
    );

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view versions for this form',
      });
    }

    const versions = await FormVersion.find({ form: formId })
      .populate('createdBy', 'name email')
      .sort({ versionNumber: -1 });

    res.json({
      success: true,
      data: versions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching versions',
      error: error.message,
    });
  }
};

/**
 * Get a specific version
 * GET /forms/:formId/versions/:versionNumber
 */
exports.getVersion = async (req, res) => {
  try {
    const { formId, versionNumber } = req.params;

    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    // Check authorization
    const isOwner = form.owner.toString() === req.user.id;
    const isShared = form.sharedWith?.some(
      (share) => share.user.toString() === req.user.id
    );

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const version = await FormVersion.findOne({
      form: formId,
      versionNumber: parseInt(versionNumber),
    }).populate('createdBy', 'name email');

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    res.json({
      success: true,
      data: version,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching version',
      error: error.message,
    });
  }
};

/**
 * Rollback form to a specific version
 * POST /forms/:formId/versions/:versionNumber/rollback
 */
exports.rollbackVersion = async (req, res) => {
  try {
    const { formId, versionNumber } = req.params;

    // Verify form exists and user is owner
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can rollback versions',
      });
    }

    // Get the version to rollback to
    const version = await FormVersion.findOne({
      form: formId,
      versionNumber: parseInt(versionNumber),
    });

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found',
      });
    }

    // Create a new version from the old version (backup current state first)
    const lastVersion = await FormVersion.findOne({ form: formId }).sort({
      versionNumber: -1,
    });
    const nextVersion = (lastVersion?.versionNumber || 0) + 1;

    // Save current state as version before rollback
    await FormVersion.create({
      form: formId,
      versionNumber: nextVersion,
      fields: form.fields || [],
      settings: {
        title: form.title,
        description: form.description,
        publicForm: form.publicForm,
      },
      createdBy: req.user.id,
      changesSummary: `Rollback from v${versionNumber}`,
      isPublished: form.publicForm,
    });

    // Update form with rolled back data
    form.fields = version.fields;
    form.title = version.settings.title;
    form.description = version.settings.description;
    form.publicForm = version.settings.publicForm;
    await form.save();

    res.json({
      success: true,
      message: `Form rolled back to version ${versionNumber}`,
      data: form,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rolling back version',
      error: error.message,
    });
  }
};

/**
 * Compare two versions
 * GET /forms/:formId/versions/compare?v1=1&v2=2
 */
exports.compareVersions = async (req, res) => {
  try {
    const { formId } = req.params;
    const { v1, v2 } = req.query;

    if (!v1 || !v2) {
      return res.status(400).json({
        success: false,
        message: 'Both version numbers required for comparison',
      });
    }

    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    // Check authorization
    const isOwner = form.owner.toString() === req.user.id;
    const isShared = form.sharedWith?.some(
      (share) => share.user.toString() === req.user.id
    );

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    // Get both versions
    const [version1, version2] = await Promise.all([
      FormVersion.findOne({
        form: formId,
        versionNumber: parseInt(v1),
      }).populate('createdBy', 'name email'),
      FormVersion.findOne({
        form: formId,
        versionNumber: parseInt(v2),
      }).populate('createdBy', 'name email'),
    ]);

    if (!version1 || !version2) {
      return res.status(404).json({
        success: false,
        message: 'One or both versions not found',
      });
    }

    // Basic comparison: count field differences
    const fieldsV1 = version1.fields || [];
    const fieldsV2 = version2.fields || [];

    const comparison = {
      version1: version1.versionNumber,
      version2: version2.versionNumber,
      createdByV1: version1.createdBy,
      createdByV2: version2.createdBy,
      fieldsCountV1: fieldsV1.length,
      fieldsCountV2: fieldsV2.length,
      settingsChanged: JSON.stringify(version1.settings) !== JSON.stringify(version2.settings),
      changesSummaryV1: version1.changesSummary,
      changesSummaryV2: version2.changesSummary,
    };

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error comparing versions',
      error: error.message,
    });
  }
};
