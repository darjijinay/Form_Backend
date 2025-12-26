// backend/src/models/Webhook.js
const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Invalid webhook URL format',
      },
    },
    events: {
      type: [String],
      required: true,
      enum: ['response.created', 'response.updated', 'response.deleted', 'form.updated'],
      default: ['response.created'],
    },
    secret: {
      type: String,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
    retryConfig: {
      maxRetries: {
        type: Number,
        default: 3,
      },
      retryDelay: {
        type: Number,
        default: 1000, // ms
      },
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    lastStatus: {
      type: String,
      enum: ['success', 'failed', 'pending', null],
      default: null,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
webhookSchema.index({ form: 1, active: 1 });
webhookSchema.index({ owner: 1, active: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
