// backend/src/controllers/googleSheets.controller.js
const GoogleSheetsIntegration = require('../models/GoogleSheetsIntegration');
const Form = require('../models/Form');
const googleSheetsSyncService = require('../services/googleSheetsSync.service');

/**
 * Get Google Sheets auth URL
 * GET /google-sheets/auth-url
 */
exports.getAuthUrl = async (req, res) => {
  try {
    const authUrl = googleSheetsSyncService.getAuthUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to authorize Google Sheets access',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating auth URL',
      error: error.message,
    });
  }
};

/**
 * Handle Google OAuth callback
 * GET /google-sheets/callback
 */
exports.handleCallback = async (req, res) => {
  try {
    const { code, formId } = req.query;

    if (!code || !formId) {
      return res.status(400).json({
        success: false,
        message: 'Missing code or formId',
      });
    }

    // Verify form exists and user is owner
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can authorize Google Sheets',
      });
    }

    // Exchange code for tokens
    const tokens = await googleSheetsSyncService.getTokensFromCode(code);

    // Store tokens (encrypted in production)
    // For now, storing in plain text - SECURITY: encrypt in production
    const integration = await GoogleSheetsIntegration.findOneAndUpdate(
      { form: formId },
      {
        form: formId,
        owner: req.user.id,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        tokenExpiry: new Date(tokens.expiry_date),
        active: true,
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Google Sheets connected successfully',
      data: {
        integrationId: integration._id,
        active: integration.active,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error handling Google OAuth callback',
      error: error.message,
    });
  }
};

/**
 * Setup Google Sheets for a form
 * POST /google-sheets/setup
 */
exports.setupGoogleSheets = async (req, res) => {
  try {
    const { formId, spreadsheetId, sheetName } = req.body;

    if (!formId || !spreadsheetId) {
      return res.status(400).json({
        success: false,
        message: 'Form ID and spreadsheet ID are required',
      });
    }

    // Verify form exists and user is owner
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }
    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can setup Google Sheets',
      });
    }

    // Update integration with spreadsheet details
    const integration = await GoogleSheetsIntegration.findOneAndUpdate(
      { form: formId },
      {
        spreadsheetId,
        sheetName: sheetName || 'Responses',
        headerRowCreated: false, // Reset to create new headers
      },
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Google Sheets integration not found. Authorize first.',
      });
    }

    res.json({
      success: true,
      message: 'Google Sheets setup updated',
      data: integration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error setting up Google Sheets',
      error: error.message,
    });
  }
};

/**
 * Get Google Sheets integration for a form
 * GET /google-sheets/form/:formId
 */
exports.getIntegration = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const isOwner = form.owner.toString() === req.user.id;
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can view integration',
      });
    }

    const integration = await GoogleSheetsIntegration.findOne({ form: formId });

    if (!integration) {
      return res.json({
        success: true,
        data: null,
        message: 'No Google Sheets integration configured',
      });
    }

    // Don't expose tokens
    const safe = integration.toObject();
    delete safe.refreshToken;
    delete safe.accessToken;

    res.json({
      success: true,
      data: safe,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching integration',
      error: error.message,
    });
  }
};

/**
 * Disconnect Google Sheets
 * DELETE /google-sheets/form/:formId
 */
exports.disconnect = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can disconnect',
      });
    }

    await GoogleSheetsIntegration.findOneAndDelete({ form: formId });

    res.json({
      success: true,
      message: 'Google Sheets disconnected',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error disconnecting Google Sheets',
      error: error.message,
    });
  }
};

/**
 * Bulk sync all responses for a form
 * POST /google-sheets/form/:formId/sync
 */
exports.bulkSync = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can trigger sync',
      });
    }

    const result = await googleSheetsSyncService.bulkSyncForm(formId);

    res.json({
      success: true,
      message: `Synced ${result.syncedCount}/${result.totalResponses} responses`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error syncing responses',
      error: error.message,
    });
  }
};

/**
 * Toggle sync on submit
 * PUT /google-sheets/form/:formId/toggle-sync
 */
exports.toggleSyncOnSubmit = async (req, res) => {
  try {
    const { formId } = req.params;
    const { syncOnSubmit } = req.body;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const integration = await GoogleSheetsIntegration.findOneAndUpdate(
      { form: formId },
      { syncOnSubmit },
      { new: true }
    );

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found',
      });
    }

    res.json({
      success: true,
      message: `Sync on submit ${syncOnSubmit ? 'enabled' : 'disabled'}`,
      data: integration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error toggling sync',
      error: error.message,
    });
  }
};
