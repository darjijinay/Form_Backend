const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      enum: ['contact', 'survey', 'registration', 'feedback', 'product', 'education', 'travel', 'appointment', 'event', 'other'],
      default: 'other',
    },
    thumbnail: {
      type: String,
      default: '',
    },
    isPremade: {
      type: Boolean,
      default: false,
    },
    fields: [
      {
        type: {
          type: String,
          required: true,
        },
        label: {
          type: String,
          required: true,
        },
        placeholder: String,
        required: {
          type: Boolean,
          default: false,
        },
        options: [String],
        validation: {
          type: mongoose.Schema.Types.Mixed,
        },
        conditional: {
          show: Boolean,
          field: String,
          value: mongoose.Schema.Types.Mixed,
        },
        order: {
          type: Number,
          default: 0,
        },
        width: {
          type: String,
          enum: ['full', 'half'],
          default: 'full',
        },
      },
    ],
    settings: {
      allowMultipleSubmissions: {
        type: Boolean,
        default: true,
      },
      requireLogin: {
        type: Boolean,
        default: false,
      },
      notifyOnSubmit: {
        type: Boolean,
        default: true,
      },
      customMessage: {
        type: String,
        default: 'Thank you for your submission!',
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

templateSchema.index({ category: 1, isPremade: 1 });
templateSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Template', templateSchema);