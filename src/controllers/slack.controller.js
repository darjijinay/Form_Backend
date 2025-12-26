// backend/src/controllers/slack.controller.js
const SlackIntegration = require('../models/SlackIntegration');
const Form = require('../models/Form');
// Slack notification service removed

/**
 * Create Slack integration
 * POST /slack
 */
exports.createSlackIntegration = async (req, res) => {
  try {
    const {
      formId,
      workspaceId,
      webhookUrl,
      botToken,
      channel,
      notifyOn,
      mentionUsers,
      threadReplies,
      includeAnswers,
      messageTemplate,
    } = req.body;

    if (!formId || (!webhookUrl && !botToken)) {
      return res.status(400).json({
        success: false,
        message: 'Form ID and either webhook URL or bot token required',
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
        message: 'Only form owner can create integrations',
      });
    }

    // Create or update integration
    const integration = await SlackIntegration.findOneAndUpdate(
      { form: formId },
      {
        form: formId,
        owner: req.user.id,
        workspaceId,
        webhookUrl,
        botToken,
        channel,
        notifyOn: notifyOn || ['response.created'],
        mentionUsers: mentionUsers || [],
        threadReplies: threadReplies || false,
        includeAnswers: includeAnswers !== false,
        messageTemplate:
          messageTemplate || 'New response received for {{formTitle}}',
        active: true,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Slack integration created',
      data: integration,
    });
  } catch (error) {
    console.error('❌ Slack integration creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating integration',
      error: error.message,
    });
  }
};

/**
 * Get Slack integration for form
 * GET /slack/form/:formId
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

    const integration = await SlackIntegration.findOne({ form: formId });

    if (!integration) {
      return res.json({
        success: true,
        data: null,
        message: 'No Slack integration configured',
      });
    }

    // Don't expose tokens
    const safe = integration.toObject();
    delete safe.botToken;

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
 * Update Slack integration
 * PUT /slack/form/:formId
 */
exports.updateIntegration = async (req, res) => {
  try {
    const { formId } = req.params;
    const {
      webhookUrl,
      channel,
      botToken,
      notifyOn,
      mentionUsers,
      threadReplies,
      includeAnswers,
      messageTemplate,
      active,
    } = req.body;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can update',
      });
    }

    const updateData = {};
    if (webhookUrl) updateData.webhookUrl = webhookUrl;
    if (channel) updateData.channel = channel;
    if (botToken) updateData.botToken = botToken;
    if (notifyOn) updateData.notifyOn = notifyOn;
    if (mentionUsers) updateData.mentionUsers = mentionUsers;
    if (typeof threadReplies === 'boolean')
      updateData.threadReplies = threadReplies;
    if (typeof includeAnswers === 'boolean')
      updateData.includeAnswers = includeAnswers;
    if (messageTemplate) updateData.messageTemplate = messageTemplate;
    if (typeof active === 'boolean') updateData.active = active;

    const integration = await SlackIntegration.findOneAndUpdate(
      { form: formId },
      updateData,
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
      message: 'Integration updated',
      data: integration,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating integration',
      error: error.message,
    });
  }
};

/**
 * Delete Slack integration
 * DELETE /slack/form/:formId
 */
exports.deleteIntegration = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only form owner can delete',
      });
    }

    await SlackIntegration.findOneAndDelete({ form: formId });

    res.json({
      success: true,
      message: 'Integration deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting integration',
      error: error.message,
    });
  }
};

/**
 * Test Slack integration
 * POST /slack/form/:formId/test
 */
exports.testIntegration = async (req, res) => {
  try {
    const { formId } = req.params;

    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    if (form.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const integration = await SlackIntegration.findOne({ form: formId });
    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found',
      });
    }

    // Slack notification service removed
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing integration',
      error: error.message,
    });
  }
};
