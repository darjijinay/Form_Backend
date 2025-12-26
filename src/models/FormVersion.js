// backend/src/models/FormVersion.js
const mongoose = require('mongoose');

const formVersionSchema = new mongoose.Schema(
  {
    form: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Form',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    title: String,
    description: String,
    fields: [{
      _id: { type: String, required: true },
      type: String,
      label: String,
      placeholder: String,
      required: Boolean,
      options: [String],
      validation: mongoose.Schema.Types.Mixed,
      width: String,
      order: Number,
      logic: mongoose.Schema.Types.Mixed,
    }],
    settings: mongoose.Schema.Types.Mixed,
    customDetails: mongoose.Schema.Types.Mixed,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changesSummary: String, // e.g., "Added 2 fields, removed 1 field"
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound index for form versions
formVersionSchema.index({ form: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('FormVersion', formVersionSchema);
