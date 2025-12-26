// server/src/models/Response.js
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    value: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    form: {
      type: String,
      ref: 'Form',
      required: true,
      index: true,
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    meta: {
      userAgent: String,
      ip: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Response', responseSchema);
