// backend/src/models/SlackIntegration.js
const mongoose = require('mongoose');

const slackIntegrationSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      unique: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspaceId: {
      type: String,
      trim: true,
    },
    webhookUrl: {
      type: String,
      trim: true,
    },
    channel: {
      type: String,
      trim: true,
      // Can be channel name or ID
    },
    botToken: {
      type: String,
      // For sending direct messages to users
    },
    active: {
      type: Boolean,
      default: true,
    },
    notifyOn: {
      type: [String],
      enum: ['response.created', 'response.updated', 'response.deleted'],
      default: ['response.created'],
    },
    mentionUsers: {
      type: [String],
      default: [],
      // Slack user IDs to mention in notifications
    },
    threadReplies: {
      type: Boolean,
      default: false,
      // Whether to reply in thread or main channel
    },
    includeAnswers: {
      type: Boolean,
      default: true,
      // Whether to include form answers in notification
    },
    messageTemplate: {
      type: String,
      default: 'New response received for {{formTitle}}',
      // Template for message customization
    },
    notificationCount: {
      type: Number,
      default: 0,
    },
    errorCount: {
      type: Number,
      default: 0,
    },
    lastNotifiedAt: {
      type: Date,
      default: null,
    },
    errors: {
      type: [
        {
          timestamp: Date,
          message: String,
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
  }
);

// Compound index for efficient queries
slackIntegrationSchema.index({ form: 1, owner: 1 });
slackIntegrationSchema.index({ owner: 1, active: 1 });

module.exports = mongoose.model('SlackIntegration', slackIntegrationSchema);
