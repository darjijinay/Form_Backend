// backend/src/controllers/webhook.controller.js
const Webhook = require('../models/Webhook');
const Form = require('../models/Form');
// Webhook delivery service removed
const crypto = require('crypto');

/**
 * Create a new webhook
 * POST /webhooks
 */
exports.createWebhook = async (req, res) => {
  try {
    const { formId, url, events, secret, description, retryConfig } = req.body;

    // Validate required fields
    if (!formId || !url || !events || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Form ID, URL, and at least one event are required',
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
        message: 'Only form owner can create webhooks',
      });
    }

    // Create webhook
    const webhook = await Webhook.create({
      form: formId,
      owner: req.user.id,
      url,
      events,
      secret: secret || crypto.randomBytes(32).toString('hex'),
      description,
      retryConfig: retryConfig || { maxRetries: 3, retryDelay: 1000 },
    });

    res.status(201).json({
      success: true,
      message: 'Webhook created successfully',
      data: webhook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating webhook',
      error: error.message,
    });
  }
};

/**
 * Get all webhooks for a form
 * GET /webhooks/form/:formId
 */
exports.getFormWebhooks = async (req, res) => {
  try {
    const { formId } = req.params;

    // Verify form exists and user has access
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({ success: false, message: 'Form not found' });
    }

    const isOwner = form.owner.toString() === req.user.id;
    const isShared = form.sharedWith?.some(
      (share) => share.user.toString() === req.user.id
    );

    if (!isOwner && !isShared) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view webhooks for this form',
      });
    }

    const webhooks = await Webhook.find({ form: formId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching webhooks',
      error: error.message,
    });
  }
};

/**
 * Get a single webhook
 * GET /webhooks/:webhookId
 */
exports.getWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhook = await Webhook.findById(webhookId).populate('form', 'title');
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    // Check authorization
    if (webhook.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({
      success: true,
      data: webhook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching webhook',
      error: error.message,
    });
  }
};

/**
 * Update a webhook
 * PUT /webhooks/:webhookId
 */
exports.updateWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { url, events, active, description, retryConfig } = req.body;

    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    // Check authorization
    if (webhook.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only webhook owner can update',
      });
    }

    // Update fields
    if (url) webhook.url = url;
    if (events) webhook.events = events;
    if (typeof active === 'boolean') webhook.active = active;
    if (description !== undefined) webhook.description = description;
    if (retryConfig) webhook.retryConfig = retryConfig;

    await webhook.save();

    res.json({
      success: true,
      message: 'Webhook updated successfully',
      data: webhook,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating webhook',
      error: error.message,
    });
  }
};

/**
 * Delete a webhook
 * DELETE /webhooks/:webhookId
 */
exports.deleteWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    // Check authorization
    if (webhook.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only webhook owner can delete',
      });
    }

    await Webhook.findByIdAndDelete(webhookId);

    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting webhook',
      error: error.message,
    });
  }
};

/**
 * Test a webhook
 * POST /webhooks/:webhookId/test
 */
exports.testWebhook = async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    // Check authorization
    if (webhook.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Webhook delivery service removed
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing webhook',
      error: error.message,
    });
  }
};

/**
 * Get webhook delivery logs (future enhancement)
 * GET /webhooks/:webhookId/logs
 */
exports.getWebhookLogs = async (req, res) => {
  try {
    const { webhookId } = req.params;

    const webhook = await Webhook.findById(webhookId);
    if (!webhook) {
      return res.status(404).json({ success: false, message: 'Webhook not found' });
    }

    // Check authorization
    if (webhook.owner.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Return basic stats for now (can be enhanced with a WebhookLog model)
    res.json({
      success: true,
      data: {
        webhookId: webhook._id,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        lastTriggered: webhook.lastTriggered,
        lastStatus: webhook.lastStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching webhook logs',
      error: error.message,
    });
  }
};
